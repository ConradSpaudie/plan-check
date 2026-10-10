"use client";

import { SEVERITY_WORD, SeverityTag } from "@/components/SeverityTag";
import type { Finding, GroupId, Report } from "@/lib/engine/types";

const GROUP_LABEL: Record<GroupId, string> = {
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
  deterministic: "Exact check",
  "cross-form": "Cross-form check",
  heuristic: "Pattern check",
} as const;

interface Props {
  report: Report;
  activeFinding: number | null;
  onSelect: (index: number) => void;
  onShowInPlan: (index: number) => void;
}

function FindingItem({
  f,
  index,
  active,
  onSelect,
  onShowInPlan,
}: {
  f: Finding;
  index: number;
  active: boolean;
  onSelect: (i: number) => void;
  onShowInPlan: (i: number) => void;
}) {
  return (
    <li
      id={`finding-${index}`}
      data-active={active}
      className={`grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 border-t border-rule py-5 sm:grid-cols-[5rem_minmax(0,1fr)] ${
        active ? "bg-paper outline outline-2 outline-offset-0 outline-[var(--focus)]" : ""
      }`}
    >
      <div className="pt-0.5">
        <SeverityTag severity={f.severity} />
      </div>
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <h4 className="text-[1.0625rem] font-bold leading-snug">{f.title}</h4>
        <p className="mt-1 max-w-prose text-pencil">{f.detail}</p>

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

        <details className="mt-3">
          <summary className="cursor-pointer font-bold">Why a reviewer cares</summary>
          <p className="mt-2 max-w-prose">{f.why}</p>
          <ul className="mt-2 list-none space-y-1 p-0 text-sm">
            {f.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-pencil">
          <span>
            Rule {f.id}. {KIND_LABEL[f.kind]}.
          </span>
          {f.evidence && f.evidence.length > 0 ? (
            <button
              type="button"
              className="font-bold text-ink underline underline-offset-4"
              onClick={() => {
                onSelect(index);
                onShowInPlan(index);
              }}
            >
              Show in my plan
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function ReportView({ report, activeFinding, onSelect, onShowInPlan }: Props) {
  const { counts, findings, fixFirst, passes, formsNeeded, steps } = report;
  const indexOf = new Map(findings.map((f, i) => [f, i] as const));

  const groups = new Map<GroupId, Finding[]>();
  for (const f of findings) {
    const list = groups.get(f.group) ?? [];
    list.push(f);
    groups.set(f.group, list);
  }

  const total = counts.fix + counts.warn + counts.verify;

  return (
    <div>
      <section aria-labelledby="summary-title">
        <h2 id="summary-title" className="font-display text-2xl font-bold">
          {total === 0
            ? "Nothing flagged"
            : `${counts.fix} ${SEVERITY_WORD.fix}, ${counts.warn} ${SEVERITY_WORD.warn}, ${counts.verify} ${SEVERITY_WORD.verify}`}
        </h2>
        <p className="mt-2 max-w-prose text-pencil">
          Plan Check is a pre-check. It cannot approve your project. Pattern checks can be wrong, so ignore any that do not apply to your project. Your fair&apos;s SRC makes the call.
        </p>
      </section>

      {fixFirst.length > 0 ? (
        <section className="mt-8" aria-labelledby="first-title">
          <h3 id="first-title" className="font-display text-xl font-bold">
            Fix these first
          </h3>
          <ol className="mt-3 list-none space-y-3 p-0">
            {fixFirst.map((f) => {
              const i = indexOf.get(f)!;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-[4.25rem] shrink-0 pt-0.5 sm:w-20">
                    <SeverityTag severity={f.severity} />
                  </span>
                  <a
                    href={`#finding-${i}`}
                    onClick={() => onSelect(i)}
                    className="font-bold leading-snug underline underline-offset-4"
                  >
                    {f.title}
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="all-title">
        <h3 id="all-title" className="font-display text-xl font-bold">
          Everything Plan Check found
        </h3>
        {Array.from(groups.entries()).map(([group, list]) => (
          <div key={group} className="mt-6">
            <h4 className="font-display text-lg font-bold">{GROUP_LABEL[group]}</h4>
            <ul className="mt-2 list-none p-0">
              {list.map((f) => {
                const i = indexOf.get(f)!;
                return (
                  <FindingItem
                    key={i}
                    f={f}
                    index={i}
                    active={activeFinding === i}
                    onSelect={onSelect}
                    onShowInPlan={onShowInPlan}
                  />
                );
              })}
            </ul>
          </div>
        ))}
        {total === 0 ? (
          <p className="mt-3 max-w-prose">
            No fixes, checks or items to verify came up. That does not mean your plan is approved. Show it to your teacher and your fair&apos;s SRC.
          </p>
        ) : null}
      </section>

      {passes.length > 0 ? (
        <details className="mt-8 border-t border-rule pt-3">
          <summary className="cursor-pointer font-display text-xl font-bold">
            What looks fine ({passes.length})
          </summary>
          <ul className="mt-3 list-none space-y-1 p-0">
            {passes.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="font-bold">
                  ✓
                </span>
                <span>{p.title}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="mt-12" aria-labelledby="forms-title">
        <h3 id="forms-title" className="font-display text-xl font-bold">
          Forms you likely need for 2026-27
        </h3>
        <p className="mt-2 max-w-prose text-pencil">
          Form numbers changed this year. Old guides may still say Form 1C or Form 2. Check the form itself.
        </p>
        <ul className="mt-3 list-none p-0">
          {formsNeeded.map((f) => (
            <li key={f.id} className="grid grid-cols-[3.5rem_1fr] gap-x-3 border-t border-rule py-3">
              <span className="font-display text-xl font-bold">{f.id}</span>
              <div>
                <p className="font-bold leading-snug">
                  {f.name}
                  {f.legacy ? <span className="font-normal text-pencil"> (was {f.legacy})</span> : null}
                </p>
                <p className="max-w-prose text-[0.975rem]">{f.why}</p>
                <p className="text-sm text-pencil">
                  Signed by {f.signedBy}.{" "}
                  {f.timing === "before"
                    ? "Dated before you start."
                    : f.timing === "after"
                      ? "Completed after you finish."
                      : "Before or after you finish."}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="order-title">
        <h3 id="order-title" className="font-display text-xl font-bold">
          Signing order
        </h3>
        <ol className="mt-3 list-decimal space-y-3 pl-6">
          {steps.map((s) => (
            <li key={s.n} className="pl-1">
              <span className="font-bold">{s.title}.</span> <span className="text-pencil">{s.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
