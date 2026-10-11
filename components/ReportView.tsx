"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { FindingRow } from "@/components/Findings";
import { SEVERITY_LABEL, SEVERITY_WORD, SeverityTag } from "@/components/SeverityTag";
import type { Finding, Report, Severity } from "@/lib/engine/types";
import { findingKey } from "@/lib/state";

export type TabId = "problems" | "plan" | "forms" | "order";

const SEVERITY_NOTE: Record<Severity, string> = {
  fix: "A reviewer is likely to send these back.",
  warn: "Worth a second look. Pattern checks can be wrong, so mark any that do not fit as Doesn't apply.",
  verify: "Confirm these with your teacher or your fair.",
};

interface Props {
  report: Report;
  /** Findings still in play, in report order. Their index is used for marks and ids. */
  visible: Finding[];
  dismissed: Finding[];
  counts: Record<Severity, number>;
  marked: Set<number>;
  active: number | null;
  expanded: Set<string>;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onToggle: (key: string) => void;
  onShowInPlan: (index: number) => void;
  onDismiss: (key: string) => void;
  onRestore: (key: string) => void;
  onAddDates: () => void;
  /** On phones the marked-up plan is a tab of the report. */
  planPanel?: ReactNode;
  /** Keep the counts and tabs pinned while the report scrolls. */
  stickyHeader: boolean;
  footer?: ReactNode;
}

export function Summary({ counts }: { counts: Record<Severity, number> }) {
  const total = counts.fix + counts.warn + counts.verify;
  if (total === 0) return <>Nothing flagged</>;
  return (
    <>
      <span className="visually-hidden">Your report: </span>
      <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {(["fix", "warn", "verify"] as const).map((s, i) => (
          <span key={s}>
            <SeverityTag severity={s}>{`${counts[s]} ${SEVERITY_WORD[s]}`}</SeverityTag>
            {i < 2 ? <span className="visually-hidden">, </span> : null}
          </span>
        ))}
      </span>
    </>
  );
}

export function ReportView(props: Props) {
  const { report, counts, tab, onTab, planPanel, stickyHeader, footer } = props;
  const tabs: { id: TabId; label: string }[] = [
    { id: "problems", label: "Problems" },
    ...(planPanel ? [{ id: "plan" as const, label: "Plan" }] : []),
    { id: "forms", label: planPanel ? "Forms" : "Forms you need" },
    { id: "order", label: "Signing order" },
  ];
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  }

  return (
    <div>
      <div
        data-report-header
        className={`z-10 border-b border-rule bg-sheet px-4 pt-4 sm:px-7 ${stickyHeader ? "sticky top-0" : ""}`}
      >
        <h2 id="summary-title" className="font-display text-[1.6rem] font-bold leading-tight" aria-live="polite">
          <Summary counts={counts} />
        </h2>
        <div role="tablist" aria-label="Report" className="no-print -mx-1 mt-3 flex gap-1 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => onTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`min-h-11 shrink-0 whitespace-nowrap border-b-[3px] px-1.5 text-[0.95rem] font-bold sm:px-2.5 sm:text-base ${
                tab === t.id ? "border-ink text-ink" : "border-transparent text-pencil hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 sm:px-7">
        <section id="panel-problems" role="tabpanel" aria-labelledby="tab-problems" className={tab !== "problems" ? "screen-hidden" : undefined} data-print-panel>
          <ProblemsPanel {...props} />
        </section>

        {planPanel ? (
          <section id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" hidden={tab !== "plan"} className="no-print">
            {planPanel}
          </section>
        ) : null}

        <section id="panel-forms" role="tabpanel" aria-labelledby="tab-forms" className={tab !== "forms" ? "screen-hidden" : undefined} data-print-panel>
          <h3 className="mt-6 font-display text-xl font-bold">Forms you likely need for 2026-27</h3>
          <p className="mt-2 max-w-prose text-pencil">
            Based on what your project involves. Form numbers changed this year, so old guides may still say Form 1C or Form 2.
          </p>
          <ul className="mt-3 list-none p-0">
            {report.formsNeeded.map((f) => (
              <li key={f.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-t border-rule py-3">
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

        <section id="panel-order" role="tabpanel" aria-labelledby="tab-order" className={tab !== "order" ? "screen-hidden" : undefined} data-print-panel>
          <h3 className="mt-6 font-display text-xl font-bold">Signing order</h3>
          <ol className="mt-3 list-decimal space-y-3 pl-6">
            {report.steps.map((s) => (
              <li key={s.n} className="pl-1">
                <span className="font-bold">{s.title}.</span> <span className="text-pencil">{s.detail}</span>
              </li>
            ))}
          </ol>
        </section>

        {footer}
      </div>
    </div>
  );
}

function ProblemsPanel({
  report,
  visible,
  dismissed,
  counts,
  marked,
  active,
  expanded,
  onToggle,
  onShowInPlan,
  onDismiss,
  onRestore,
  onAddDates,
}: Props) {
  const total = counts.fix + counts.warn + counts.verify;
  const bySeverity = (["fix", "warn", "verify"] as const).map((s) => ({
    s,
    items: visible.map((f, i) => ({ f, i })).filter(({ f }) => f.severity === s),
  }));

  return (
    <div>
      <p className="mt-4 max-w-prose text-sm text-pencil">
        Plan Check is a pre-check and cannot approve your project. Your fair&apos;s SRC makes the call.
      </p>

      {report.needed.length > 0 ? (
        <div className="mt-5 border-l-4 border-ink bg-paper px-4 py-3">
          <h3 className="font-display text-lg font-bold">Still needed from you ({report.needed.length})</h3>
          <p className="mt-1 max-w-prose text-sm text-pencil">
            These are not problems with your plan. Plan Check needs them to check that your forms are signed in the right order.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {report.needed.map((f) => (
              <li key={findingKey(f)}>{f.title}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-sm no-print mt-3" onClick={onAddDates}>
            Add dates
          </button>
        </div>
      ) : null}

      {bySeverity.map(({ s, items }) =>
        items.length === 0 ? null : (
          <section key={s} className="mt-7" aria-labelledby={`sev-${s}`}>
            <h3 id={`sev-${s}`} className="font-display text-xl font-bold">
              <SeverityTag severity={s}>{SEVERITY_LABEL[s]}</SeverityTag> <span className="text-pencil">({items.length})</span>
            </h3>
            <p className="mt-1 max-w-prose text-sm text-pencil">{SEVERITY_NOTE[s]}</p>
            <ul className="mt-2 list-none border-b border-rule p-0">
              {items.map(({ f, i }) => {
                const key = findingKey(f);
                return (
                  <FindingRow
                    key={key}
                    f={f}
                    index={i}
                    open={expanded.has(key)}
                    active={active === i}
                    marked={marked.has(i)}
                    onToggle={() => onToggle(key)}
                    onShowInPlan={() => onShowInPlan(i)}
                    onDismiss={() => onDismiss(key)}
                  />
                );
              })}
            </ul>
          </section>
        ),
      )}

      {total === 0 ? (
        <p className="mt-6 max-w-prose">
          Nothing to fix, review or verify came up. That does not mean your plan is approved. Show it to your teacher and your fair&apos;s SRC.
        </p>
      ) : null}

      {dismissed.length > 0 ? (
        <details className="no-print mt-6 border-t border-rule">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">
            Marked as not applying ({dismissed.length})
          </summary>
          <ul className="list-none p-0">
            {dismissed.map((f) => {
              const key = findingKey(f);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rule py-2">
                  <span className="min-w-0 text-pencil line-through decoration-1">{f.title}</span>
                  <button type="button" className="btn btn-sm" onClick={() => onRestore(key)}>
                    Restore
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      {report.passes.length > 0 ? (
        <details className="mt-4 border-t border-rule">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">What looks fine ({report.passes.length})</summary>
          <ul className="mt-1 list-none space-y-1 p-0">
            {report.passes.map((p, i) => (
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
    </div>
  );
}
