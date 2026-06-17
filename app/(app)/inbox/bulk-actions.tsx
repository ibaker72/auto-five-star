"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  bulkGenerateDraftsAction,
  bulkMarkSkippedAction,
  bulkPostApprovedAction,
} from "./actions";

type Props = {
  bulkAllowed: boolean;
  reviewIds: string[];
};

/**
 * Bulk-action toolbar. Rendered in /inbox above the list; binds to checkboxes
 * with name="review_id" inside the same page via DOM queries so the list
 * itself can stay server-rendered.
 */
export function BulkActionsBar({ bulkAllowed, reviewIds }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const allBoxRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Sync selection state with the checkboxes rendered by the list rows.
  useEffect(() => {
    function read() {
      const boxes = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][data-review-id]',
        ),
      );
      const ids = boxes.filter((b) => b.checked).map((b) => b.dataset.reviewId ?? "");
      setSelected(ids.filter(Boolean));
    }
    document.addEventListener("change", read);
    read();
    return () => document.removeEventListener("change", read);
  }, [reviewIds]);

  function selectAll(check: boolean) {
    const boxes = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][data-review-id]',
    );
    boxes.forEach((b) => (b.checked = check));
    setSelected(check ? reviewIds : []);
  }

  function submitWith(
    action:
      | typeof bulkGenerateDraftsAction
      | typeof bulkMarkSkippedAction
      | typeof bulkPostApprovedAction,
  ) {
    const fd = new FormData();
    for (const id of selected) fd.append("review_id", id);
    startTransition(async () => {
      await action(fd);
    });
  }

  function submitExport() {
    const f = formRef.current;
    if (!f) return;
    // Clear any previous selection markup and inject current selection.
    f.querySelectorAll('input[name="review_id"]').forEach((n) => n.remove());
    for (const id of selected) {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = "review_id";
      i.value = id;
      f.appendChild(i);
    }
    f.submit();
  }

  const disabled = !bulkAllowed || selected.length === 0 || pending;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-md border bg-card p-2",
        !bulkAllowed && "opacity-90",
      )}
    >
      <label className="flex items-center gap-2 px-1 text-sm">
        <input
          ref={allBoxRef}
          type="checkbox"
          onChange={(e) => selectAll(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="text-muted-foreground">
          {selected.length} selected
        </span>
      </label>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {!bulkAllowed ? (
          <span className="text-xs text-muted-foreground">
            Bulk actions are Pro-only.{" "}
            <Link href="/billing" className="font-medium underline">
              Upgrade →
            </Link>
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => submitWith(bulkGenerateDraftsAction)}
        >
          Generate drafts
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => submitWith(bulkPostApprovedAction)}
        >
          Post selected
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => submitWith(bulkMarkSkippedAction)}
        >
          Mark skipped
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={submitExport}
        >
          Export CSV
        </Button>
        <form
          ref={formRef}
          action="/api/reviews/export"
          method="post"
          className="hidden"
        />
      </div>
    </div>
  );
}
