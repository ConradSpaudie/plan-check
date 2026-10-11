"use client";

import { useEffect, useRef } from "react";
import { FindingBody, GROUP_LABEL } from "@/components/Findings";
import { SeverityTag } from "@/components/SeverityTag";
import type { Finding } from "@/lib/engine/types";

interface Props {
  finding: Finding | null;
  marked: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onSeeAll: () => void;
}

/**
 * On phones a mark opens its note over the plan, so the student never loses their place.
 * A native modal dialog gives focus trapping, Escape to close and focus return for free.
 */
export function FindingSheet({ finding, marked, onClose, onDismiss, onSeeAll }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (finding && !d.open) d.showModal();
    if (!finding && d.open) d.close();
  }, [finding]);

  return (
    <dialog
      ref={ref}
      className="note-sheet no-print"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      {finding ? (
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-6 pt-3">
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-rule" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SeverityTag severity={finding.severity} />
              <h2 id="sheet-title" className="mt-2 font-sans text-lg font-bold leading-snug tracking-normal">
                {finding.title}
              </h2>
              <p className="text-sm text-pencil">{GROUP_LABEL[finding.group]}</p>
            </div>
            <button type="button" className="btn btn-sm shrink-0" onClick={() => ref.current?.close()}>
              Close
            </button>
          </div>
          <div className="mt-3">
            <FindingBody f={finding} marked={marked} onDismiss={onDismiss} />
          </div>
          <button type="button" className="link-btn mt-1" onClick={onSeeAll}>
            See all problems
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
