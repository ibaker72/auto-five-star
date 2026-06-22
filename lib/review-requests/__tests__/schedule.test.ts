import { describe, it, expect } from "vitest";
import {
  addDays,
  recipientDayOffset,
  recipientScheduledAt,
  campaignDaySpan,
  buildSchedule,
  isCampaignSendable,
  isPendingRecipientStatus,
  selectDueRecipients,
  shouldSkipForEntitlement,
  isCampaignComplete,
  nextScheduledWindow,
  summarizeBatch,
} from "../schedule";

const START = new Date("2026-06-01T09:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("scheduling calculation", () => {
  it("buckets recipients into days by daily limit", () => {
    // dailyLimit 10 → indices 0-9 day0, 10-19 day1, 20-29 day2
    expect(recipientDayOffset(0, 10)).toBe(0);
    expect(recipientDayOffset(9, 10)).toBe(0);
    expect(recipientDayOffset(10, 10)).toBe(1);
    expect(recipientDayOffset(25, 10)).toBe(2);
  });

  it("guards against non-positive / non-finite daily limits", () => {
    expect(recipientDayOffset(5, 0)).toBe(0);
    expect(recipientDayOffset(5, -1)).toBe(0);
    expect(recipientDayOffset(5, Infinity)).toBe(0);
    expect(recipientDayOffset(-3, 10)).toBe(0);
  });

  it("computes scheduledAt by adding day offsets to the start", () => {
    expect(recipientScheduledAt(0, 10, START).getTime()).toBe(START.getTime());
    expect(recipientScheduledAt(10, 10, START).getTime()).toBe(
      START.getTime() + DAY_MS,
    );
    expect(recipientScheduledAt(20, 10, START).getTime()).toBe(
      START.getTime() + 2 * DAY_MS,
    );
  });

  it("computes the campaign day span", () => {
    expect(campaignDaySpan(0, 10)).toBe(0);
    expect(campaignDaySpan(10, 10)).toBe(1);
    expect(campaignDaySpan(11, 10)).toBe(2);
    expect(campaignDaySpan(100, 25)).toBe(4);
    expect(campaignDaySpan(5, 0)).toBe(1);
  });

  it("builds a full per-recipient schedule in order", () => {
    const schedule = buildSchedule(25, 10, START);
    expect(schedule).toHaveLength(25);
    expect(schedule[0]!.getTime()).toBe(START.getTime());
    expect(schedule[9]!.getTime()).toBe(START.getTime());
    expect(schedule[10]!.getTime()).toBe(START.getTime() + DAY_MS);
    expect(schedule[24]!.getTime()).toBe(START.getTime() + 2 * DAY_MS);
  });

  it("addDays does not mutate the input", () => {
    const d = new Date(START);
    addDays(d, 3);
    expect(d.getTime()).toBe(START.getTime());
  });
});

describe("campaign + recipient state guards", () => {
  it("only scheduled/sending campaigns are sendable", () => {
    expect(isCampaignSendable("scheduled")).toBe(true);
    expect(isCampaignSendable("sending")).toBe(true);
    expect(isCampaignSendable("paused")).toBe(false);
    expect(isCampaignSendable("completed")).toBe(false);
    expect(isCampaignSendable("draft")).toBe(false);
    expect(isCampaignSendable("failed")).toBe(false);
  });

  it("only pending recipients are sendable", () => {
    expect(isPendingRecipientStatus("pending")).toBe(true);
    expect(isPendingRecipientStatus("sent")).toBe(false);
    expect(isPendingRecipientStatus("failed")).toBe(false);
    expect(isPendingRecipientStatus("skipped")).toBe(false);
  });
});

type R = { id: string; status: string; scheduledAt: Date | null };

function rec(id: string, status: string, offsetDays: number | null): R {
  return {
    id,
    status,
    scheduledAt: offsetDays === null ? null : addDays(START, offsetDays),
  };
}

describe("selectDueRecipients", () => {
  const now = addDays(START, 0); // exactly START

  it("returns only due, pending recipients", () => {
    const recipients = [
      rec("a", "pending", 0), // due
      rec("b", "pending", 1), // future
      rec("c", "sent", 0), // already sent
      rec("d", "pending", null), // null = due asap
    ];
    const due = selectDueRecipients(recipients, {
      now,
      dailyLimit: null,
      sentInWindow: 0,
    });
    expect(due.map((r) => r.id).sort()).toEqual(["a", "d"]);
  });

  it("enforces the daily limit against already-sent in the window", () => {
    const recipients = [
      rec("a", "pending", 0),
      rec("b", "pending", 0),
      rec("c", "pending", 0),
      rec("d", "pending", 0),
    ];
    // limit 3, already sent 2 today → only 1 more may go
    const due = selectDueRecipients(recipients, {
      now,
      dailyLimit: 3,
      sentInWindow: 2,
    });
    expect(due).toHaveLength(1);
  });

  it("returns nothing when the daily limit is already exhausted", () => {
    const recipients = [rec("a", "pending", 0), rec("b", "pending", 0)];
    const due = selectDueRecipients(recipients, {
      now,
      dailyLimit: 5,
      sentInWindow: 5,
    });
    expect(due).toHaveLength(0);
  });

  it("never re-selects sent/failed recipients (no duplicate sends)", () => {
    const recipients = [
      rec("a", "sent", 0),
      rec("b", "failed", 0),
      rec("c", "skipped", 0),
    ];
    const due = selectDueRecipients(recipients, {
      now,
      dailyLimit: 50,
      sentInWindow: 0,
    });
    expect(due).toHaveLength(0);
  });

  it("orders due recipients by scheduledAt ascending", () => {
    const recipients = [
      rec("late", "pending", 0),
      rec("early", "pending", -1),
    ];
    const due = selectDueRecipients(recipients, {
      now: addDays(START, 1),
      dailyLimit: 10,
      sentInWindow: 0,
    });
    expect(due.map((r) => r.id)).toEqual(["early", "late"]);
  });
});

describe("entitlement gating", () => {
  it("skips sms recipients when the org is not entitled", () => {
    expect(shouldSkipForEntitlement("sms", { smsEntitled: false })).toBe(true);
    expect(shouldSkipForEntitlement("sms", { smsEntitled: true })).toBe(false);
    expect(shouldSkipForEntitlement("email", { smsEntitled: false })).toBe(
      false,
    );
  });
});

describe("completion + next window", () => {
  it("is complete only when no pending remain", () => {
    expect(isCampaignComplete({ pending: 0 })).toBe(true);
    expect(isCampaignComplete({ pending: 3 })).toBe(false);
  });

  it("returns the earliest future pending send time", () => {
    const recipients = [
      rec("a", "pending", 2),
      rec("b", "pending", 1),
      rec("c", "sent", 5),
      rec("d", "pending", null), // null doesn't count as a future window
    ];
    const next = nextScheduledWindow(recipients, START);
    expect(next?.getTime()).toBe(addDays(START, 1).getTime());
  });

  it("returns null when nothing is scheduled in the future", () => {
    const recipients = [rec("a", "sent", 1), rec("b", "pending", -1)];
    expect(nextScheduledWindow(recipients, START)).toBeNull();
  });
});

describe("summarizeBatch (retry/failure tallying)", () => {
  it("tallies sent / skipped / failed", () => {
    const summary = summarizeBatch([
      { status: "sent" },
      { status: "sent" },
      { status: "skipped" },
      { status: "failed" },
    ]);
    expect(summary).toEqual({ sent: 2, skipped: 1, failed: 1 });
  });

  it("handles an empty batch", () => {
    expect(summarizeBatch([])).toEqual({ sent: 0, skipped: 0, failed: 0 });
  });
});
