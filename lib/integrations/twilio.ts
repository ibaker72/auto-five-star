import "server-only";
import twilio, { type Twilio } from "twilio";

const SMS_LIVE = process.env.SMS_LIVE === "true";
const IS_PROD = process.env.NODE_ENV === "production";

export class SmsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsConfigError";
  }
}

let _client: Twilio | null = null;
function client(): Twilio {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new SmsConfigError(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required",
      );
    }
    _client = twilio(sid, token);
  }
  return _client;
}

export type SendSmsResult = {
  ok: boolean;
  fixture: boolean;
  providerId: string | null;
  error?: string;
};

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  if (!SMS_LIVE) {
    if (IS_PROD) {
      // Per A2P reality: when SMS_LIVE=false in production, the operator has
      // intentionally disabled SMS (e.g., A2P campaign pending). We do NOT
      // throw — the dispatcher records the notification as "skipped" so we
      // can surface that state in the UI.
      return {
        ok: false,
        fixture: false,
        providerId: null,
        error: "sms_disabled",
      };
    }
    console.log(
      `[sms/fixture] to=${params.to} body=${JSON.stringify(params.body)}`,
    );
    return { ok: true, fixture: true, providerId: null };
  }

  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new SmsConfigError("TWILIO_FROM_NUMBER is required when SMS_LIVE=true");
  }

  try {
    const message = await client().messages.create({
      to: params.to,
      from,
      body: params.body,
    });
    return {
      ok: true,
      fixture: false,
      providerId: message.sid,
    };
  } catch (err) {
    return {
      ok: false,
      fixture: false,
      providerId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type NegativeReviewSmsInput = {
  locationName: string;
  rating: 1 | 2;
  reviewUrl: string;
};

export function buildNegativeReviewSms(input: NegativeReviewSmsInput): string {
  // Keep under 160 chars so it's a single segment.
  const max = 160;
  const tmpl = `AutoFiveStar: New ${input.rating}-star review for ${input.locationName}. Review and respond: ${input.reviewUrl}`;
  if (tmpl.length <= max) return tmpl;
  // Trim the location name first if needed.
  const fixed = `AutoFiveStar: New ${input.rating}-star review. Review and respond: ${input.reviewUrl}`;
  return fixed;
}

export async function sendNegativeReviewSmsAlert(
  to: string,
  input: NegativeReviewSmsInput,
): Promise<SendSmsResult> {
  return sendSms({ to, body: buildNegativeReviewSms(input) });
}
