"use client";

import type { Segment } from "@/lib/annotate";

const CLASS = { fix: "mk mk-fix", warn: "mk mk-warn", verify: "mk mk-verify" } as const;
const SR = { fix: "Fix", warn: "Review", verify: "Verify" } as const;

interface Props {
  segments: Segment[];
  activeFinding: number | null;
  onSelect: (index: number) => void;
}

/** The student's own plan with a reviewer's marks on it. Text is never changed. */
export function AnnotatedPlan({ segments, activeFinding, onSelect }: Props) {
  const firstSeen = new Set<number>();

  return (
    <div className="whitespace-pre-wrap [overflow-wrap:anywhere] px-5 py-5 text-[1.0625rem] leading-[1.85]">
      {segments.map((seg, i) => {
        if (seg.finding === undefined || !seg.severity) return <span key={i}>{seg.text}</span>;
        const isFirst = !firstSeen.has(seg.finding);
        firstSeen.add(seg.finding);
        return (
          <mark
            key={i}
            id={isFirst ? `mark-${seg.finding}` : undefined}
            className={`${CLASS[seg.severity]} bg-transparent`}
            style={seg.severity === "warn" ? { backgroundColor: "var(--hi)" } : undefined}
            data-active={activeFinding === seg.finding}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(seg.finding!)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(seg.finding!);
              }
            }}
          >
            <span className="visually-hidden">{SR[seg.severity]}: </span>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
