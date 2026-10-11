"use client";

import type { Finding, GroupId } from "@/lib/engine/types";

export const GROUP_LABEL: Record<GroupId, string> = {
  dates: "Dates and approvals",
  forms: "Forms",
  human: "Human participants",
  animals: "Vertebrate animals",
  bio: "Biological agents",
  safety: "Risk and safety",
  procedure: "Procedure",
  structure: "Plan sections",
  bibliography: "Bibliography",
  analysis: "Data analysis",
  ai: "AI use",
  computational: "Data and code",
};

const KIND_LABEL = {
  deterministic: "exact check",
  "cross-form": "cross-form check",
  heuristic: "pattern check",
} as const;

interface BodyProps {
  f: Finding;
  /** The finding has a mark in the plan. */
  marked: boolean;
  onShowInPlan?: () => void;
  onDismiss: () => void;
}

/** Everything under a finding's title: what was seen, the student's own words, a question, and why it matters. */
export function FindingBody({ f, marked, onShowInPlan, onDismiss }: BodyProps) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="max-w-prose text-pencil">{f.detail}</p>

      {f.evidence && f.evidence.length > 0 ? (
        <div className="mt-3 border-l-4 border-ink pl-3">
          <p className="text-sm font-bold">From your plan</p>
          <ul className="mt-1 list-none space-y-1 p-0">
            {f.evidence.map((e, i) => (
              <li key={i} className="text-[0.975rem] italic leading-snug">
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {f.askYourself ? (
        <p className="mt-3 max-w-prose">
          <span className="font-bold">Ask yourself: </span>
          {f.askYourself}
        </p>
      ) : null}

      <div className="no-print mt-3 flex flex-wrap gap-2">
        {marked && onShowInPlan ? (
          <button type="button" className="btn btn-sm" onClick={onShowInPlan}>
            Show in my plan
          </button>
        ) : null}
        <button type="button" className="btn btn-sm" onClick={onDismiss}>
          Doesn&apos;t apply
        </button>
      </div>

      <details className="mt-2">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">Why a reviewer cares</summary>
        <p className="max-w-prose">{f.why}</p>
        <ul className="mt-2 list-none space-y-1 p-0 text-sm">
          {f.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="tap-link underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-pencil">
          Rule {f.id}, {KIND_LABEL[f.kind]}.
        </p>
      </details>
    </div>
  );
}

interface RowProps extends Omit<BodyProps, "onShowInPlan"> {
  index: number;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onShowInPlan: () => void;
}

/** One line per finding. The title is a button that opens the rest. */
export function FindingRow({ f, index, open, active, marked, onToggle, onShowInPlan, onDismiss }: RowProps) {
  const bodyId = `finding-${index}-body`;
  return (
    <li
      id={`finding-${index}`}
      data-active={active}
      className={`scroll-mt-28 border-t border-rule ${active ? "bg-paper outline outline-2 outline-offset-0 outline-[var(--focus)]" : ""}`}
    >
      <h4 className="m-0 font-sans text-base font-normal tracking-normal">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-11 w-full items-start gap-3 px-1 py-3 text-left"
        >
          <span aria-hidden className="mt-[0.05rem] w-4 shrink-0 text-center font-display text-lg font-bold leading-6">
            {open ? "−" : "+"}
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <span className="block font-bold leading-snug">{f.title}</span>
            <span className="mt-0.5 block text-sm text-pencil">
              {GROUP_LABEL[f.group]}
              {marked ? ", marked in your plan" : ""}
            </span>
          </span>
        </button>
      </h4>
      {/* Always rendered so printing can show every finding; hidden on screen until opened. */}
      <div id={bodyId} data-print-body className={`pb-4 pl-8 pr-1 ${open ? "" : "screen-hidden"}`}>
        <FindingBody f={f} marked={marked} onShowInPlan={onShowInPlan} onDismiss={onDismiss} />
      </div>
    </li>
  );
}
