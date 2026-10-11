"use client";

import type { Step } from "@/lib/state";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Your plan" },
  { n: 2, label: "Confirm" },
  { n: 3, label: "Report" },
];

interface Props {
  step: Step;
  /** Steps 2 and 3 open once there is a plan. */
  canAdvance: boolean;
  onGo: (step: Step) => void;
}

/** The three steps, in order. Each is a button once it is available. */
export function Stepper({ step, canAdvance, onGo }: Props) {
  return (
    <nav aria-label="Steps" className="no-print">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 sm:gap-x-2">
        {STEPS.map((s, i) => {
          const current = s.n === step;
          const done = s.n < step;
          const available = s.n === 1 || canAdvance;
          return (
            <li key={s.n} className="flex items-center gap-1 sm:gap-2">
              {i > 0 ? <span aria-hidden className="hidden h-0.5 w-10 bg-rule sm:block" /> : null}
              <button
                type="button"
                disabled={!available}
                aria-current={current ? "step" : undefined}
                onClick={() => onGo(s.n)}
                className={`flex min-h-11 items-center gap-2 px-1 font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                  current ? "text-ink" : "text-pencil hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-7 w-7 place-items-center border-2 font-display text-sm leading-none ${
                    current ? "border-ink bg-ink text-sheet" : done ? "border-ink text-ink" : "border-rule"
                  }`}
                >
                  {done ? "✓" : s.n}
                </span>
                <span>
                  <span className="visually-hidden">Step {s.n}: </span>
                  {s.label}
                  {done ? <span className="visually-hidden"> (done)</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
