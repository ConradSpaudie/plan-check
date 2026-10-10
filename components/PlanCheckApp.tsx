"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AiReview } from "@/components/AiReview";
import { AnnotatedPlan } from "@/components/AnnotatedPlan";
import { DatesPanel } from "@/components/DatesPanel";
import { ProfilePicker } from "@/components/ProfilePicker";
import { ReportView } from "@/components/ReportView";
import {
  detectFromPlan,
  emptyProfile,
  runChecks,
  suggestProfile,
  type FormDates,
  type Profile,
} from "@/lib/engine";
import { STRONG_SAMPLE, WEAK_SAMPLE, type Sample } from "@/lib/samples";

// Today's date is read on the client only, so the prerendered page never bakes in a build-time date.
const noop = () => () => {};
const clientToday = () => new Date().toLocaleDateString("en-CA");
const serverToday = () => "";
function useToday(): string {
  return useSyncExternalStore(noop, clientToday, serverToday);
}

export function PlanCheckApp() {
  const [plan, setPlan] = useState("");
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile });
  const [touched, setTouched] = useState<Set<keyof Profile>>(new Set());
  const [dates, setDates] = useState<FormDates>({});
  const [deadline, setDeadline] = useState("");
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState<"edit" | "marked">("edit");
  const [active, setActive] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const today = useToday();
  const deferredPlan = useDeferredValue(plan);
  const detected = useMemo(() => detectFromPlan(deferredPlan), [deferredPlan]);

  const report = useMemo(
    () =>
      today
        ? runChecks({
            plan: deferredPlan,
            profile,
            dates,
            deadline: deadline || undefined,
            today,
          })
        : null,
    [deferredPlan, profile, dates, deadline, today],
  );

  const autoTick = useCallback(
    (text: string, base: Profile, locked: Set<keyof Profile>) => {
      const s = suggestProfile(detectFromPlan(text));
      const next = { ...base };
      for (const k of Object.keys(s) as (keyof Profile)[]) {
        if (!locked.has(k) && s[k] !== undefined) next[k] = s[k] as boolean;
      }
      return next;
    },
    [],
  );

  function runCheck() {
    if (!plan.trim()) return;
    setProfile((p) => autoTick(plan, p, touched));
    setChecked(true);
    setView("marked");
    setActive(null);
    requestAnimationFrame(() => sheetRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  function loadSample(s: Sample) {
    setPlan(s.plan);
    const locked = new Set<keyof Profile>();
    setTouched(locked);
    setProfile(autoTick(s.plan, { ...s.profile }, locked));
    setDates({ ...s.dates });
    setDeadline(s.deadline ?? "");
    setChecked(true);
    setView("marked");
    setActive(null);
  }

  function clearAll() {
    setPlan("");
    setProfile({ ...emptyProfile });
    setTouched(new Set());
    setDates({});
    setDeadline("");
    setChecked(false);
    setView("edit");
    setActive(null);
  }

  function toggle(key: keyof Profile) {
    setTouched((t) => new Set(t).add(key));
    setProfile((p) => ({ ...p, [key]: !p[key] }));
  }

  function showInPlan(i: number) {
    setView("marked");
    requestAnimationFrame(() => {
      document.getElementById(`mark-${i}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function selectFromPlan(i: number) {
    setActive(i);
    document.getElementById(`finding-${i}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const showMarks = checked && view === "marked";
  const words = report?.wordCount ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        <div ref={sheetRef} className="scroll-mt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="plan-title" className="font-display text-2xl font-bold">
              Your research plan
            </h2>
            <p className="text-sm text-pencil" aria-live="polite">
              {words} {words === 1 ? "word" : "words"}
            </p>
          </div>
          <p className="mt-2 max-w-prose text-pencil">
            Paste your plan below. It stays in this browser. Nothing is uploaded unless you use the optional AI review.
          </p>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="View">
            <button
              type="button"
              className={`btn ${!showMarks ? "btn-solid" : ""}`}
              aria-pressed={!showMarks}
              onClick={() => setView("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              className={`btn ${showMarks ? "btn-solid" : ""}`}
              aria-pressed={showMarks}
              disabled={!checked}
              onClick={() => setView("marked")}
            >
              Marked up
            </button>
          </div>

          <div className="sheet mt-3">
            {showMarks ? (
              <div className="max-h-[70vh] overflow-y-auto">
                <AnnotatedPlan
                  plan={deferredPlan}
                  findings={report?.findings ?? []}
                  activeFinding={active}
                  onSelect={selectFromPlan}
                />
              </div>
            ) : (
              <>
                <label htmlFor="plan" className="visually-hidden">
                  Paste your research plan
                </label>
                <textarea
                  id="plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Paste your research plan here, or load a sample below."
                  rows={18}
                  spellCheck
                  className="block min-h-[22rem] w-full resize-y border-0 bg-transparent px-5 py-5 text-[1.0625rem] leading-[1.85] text-ink outline-none placeholder:text-pencil focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--focus)]"
                />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-solid" onClick={runCheck} disabled={!plan.trim()}>
              Check my plan
            </button>
            <button type="button" className="btn" onClick={clearAll} disabled={!plan && !checked}>
              Clear
            </button>
            {checked ? (
              <a href="#report" className="btn no-underline lg:hidden">
                Go to my report
              </a>
            ) : null}
          </div>

          <div className="mt-6 border-t border-rule pt-4">
            <p className="font-bold">No plan handy? Try a sample.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[WEAK_SAMPLE, STRONG_SAMPLE].map((s) => (
                <button key={s.id} type="button" className="btn" onClick={() => loadSample(s)}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-2 max-w-prose text-sm text-pencil">Both samples are invented for this demo.</p>
          </div>

          {showMarks ? (
            <p className="mt-6 max-w-prose text-sm text-pencil">
              Marks: <span className="mk mk-fix">red wavy line</span> is a fix,{" "}
              <span className="mk mk-warn">highlighter</span> is something to check,{" "}
              <span className="mk mk-verify">dashed pencil</span> is something to verify. Tap a mark to jump to its note.
            </p>
          ) : null}
        </div>

        <div className="mt-14">
          <ProfilePicker profile={profile} detected={detected} onToggle={toggle} />
        </div>

        <div className="mt-14">
          <DatesPanel
            profile={profile}
            dates={dates}
            deadline={deadline}
            onDate={(k, v) => setDates((d) => ({ ...d, [k]: v || undefined }))}
            onDeadline={setDeadline}
          />
        </div>
      </div>

      <div id="report" className="min-w-0 scroll-mt-4">
        {checked && report ? (
          <>
            <div className="sheet px-5 py-6 sm:px-7">
              <ReportView
                report={report}
                activeFinding={active}
                onSelect={setActive}
                onShowInPlan={showInPlan}
              />
              <div className="no-print mt-10 border-t border-rule pt-5">
                <button type="button" className="btn" onClick={() => window.print()}>
                  Print or save as PDF
                </button>
              </div>
            </div>
            <div className="no-print mt-10">
              <AiReview plan={plan} />
            </div>
          </>
        ) : (
          <div className="sheet px-5 py-8 sm:px-7">
            <h2 className="font-display text-2xl font-bold">Your report appears here</h2>
            <p className="mt-2 max-w-prose text-pencil">
              Paste your plan and press Check my plan. You will get the problems to fix first, the forms you probably need, and the order to sign them in.
            </p>
            <p className="mt-3 max-w-prose text-pencil">
              Want to see it first? Load a sample on the left.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
