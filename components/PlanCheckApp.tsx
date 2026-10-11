"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { AiReview } from "@/components/AiReview";
import { AnnotatedPlan } from "@/components/AnnotatedPlan";
import { DatesPanel } from "@/components/DatesPanel";
import { FindingSheet } from "@/components/FindingSheet";
import { Hero } from "@/components/Hero";
import { ProfilePicker } from "@/components/ProfilePicker";
import { ReportView, Summary, type TabId } from "@/components/ReportView";
import { SEVERITY_LABEL } from "@/components/SeverityTag";
import { Stepper } from "@/components/Stepper";
import { annotate } from "@/lib/annotate";
import { detectFromPlan, runChecks, type Finding, type Profile, type Severity } from "@/lib/engine";
import { words as countWords } from "@/lib/engine/text";
import { ACCEPT, ExtractError, extractPlanText } from "@/lib/extract";
import { STRONG_SAMPLE, WEAK_SAMPLE, type Sample } from "@/lib/samples";
import {
  STORAGE_KEY,
  findingKey,
  hasData,
  initialState,
  parseSaved,
  profileOf,
  reducer,
  type Step,
} from "@/lib/state";

/** The AI review stays hidden until the site owner switches it on (NEXT_PUBLIC_AI_REVIEW=1). */
const AI_REVIEW = process.env.NEXT_PUBLIC_AI_REVIEW === "1";

// Today's date is read on the client only, so the prerendered page never bakes in a build-time date.
const noop = () => () => {};
const clientToday = () => new Date().toLocaleDateString("en-CA");
const serverToday = () => "";
function useToday(): string {
  return useSyncExternalStore(noop, clientToday, serverToday);
}

const WIDE = "(min-width: 64rem)";
function subscribeWide(cb: () => void) {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** Desktop layout (plan and report side by side) or phone layout (report tabs). */
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

function smooth(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

type FileState = { kind: "idle" | "reading" | "done" | "error"; message: string };

/** Asks twice before wiping, because it cannot be undone. */
function ClearButton({ onClear }: { onClear: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        if (armed) {
          setArmed(false);
          onClear();
        } else setArmed(true);
      }}
    >
      {armed ? "Select again to clear everything" : "Clear my data"}
    </button>
  );
}

export function PlanCheckApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [fileState, setFileState] = useState<FileState>({ kind: "idle", message: "" });
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabId>("problems");
  const [sheet, setSheet] = useState<number | null>(null);
  const [scrollReq, setScrollReq] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const reportScrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const today = useToday();
  const wide = useWide();

  // ---------------------------------------------------------------- saved in this browser
  useEffect(() => {
    let saved = null;
    try {
      saved = parseSaved(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage can be blocked (private mode, school policies). The page works without it.
    }
    if (saved) dispatch({ type: "restore", state: saved });
  }, []);

  useEffect(() => {
    // The untouched initial state is never written, so it cannot overwrite a saved plan on first load.
    if (state === initialState) return;
    const t = setTimeout(() => {
      try {
        if (hasData(state)) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Full or blocked storage: keep working without saving.
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  // ---------------------------------------------------------------- the live report
  const deferredPlan = useDeferredValue(state.plan);
  const detected = useMemo(() => detectFromPlan(deferredPlan), [deferredPlan]);
  const profile = useMemo(() => profileOf(detected, state.overrides), [detected, state.overrides]);

  const report = useMemo(
    () =>
      today
        ? runChecks({ plan: deferredPlan, profile, dates: state.dates, deadline: state.deadline || undefined, today })
        : null,
    [deferredPlan, profile, state.dates, state.deadline, today],
  );

  const { visible, dismissed, counts } = useMemo(() => {
    const gone = new Set(state.dismissed);
    const visible: Finding[] = [];
    const dismissed: Finding[] = [];
    for (const f of report?.findings ?? []) (gone.has(findingKey(f)) ? dismissed : visible).push(f);
    const counts: Record<Severity, number> = { fix: 0, warn: 0, verify: 0 };
    for (const f of visible) counts[f.severity]++;
    return { visible, dismissed, counts };
  }, [report, state.dismissed]);

  const segments = useMemo(() => annotate(deferredPlan, visible), [deferredPlan, visible]);
  const marked = useMemo(() => {
    const s = new Set<number>();
    for (const seg of segments) if (seg.finding !== undefined) s.add(seg.finding);
    return s;
  }, [segments]);
  const unmarked = visible.map((f, i) => ({ f, i })).filter(({ i }) => !marked.has(i));

  const hasPlan = state.plan.trim().length > 0;
  const step: Step = hasPlan ? state.step : 1;
  const currentTab: TabId = wide && tab === "plan" ? "problems" : tab;

  // ---------------------------------------------------------------- moving between steps
  // Every step change brings the top of the app into view and moves focus to the step's heading.
  useEffect(() => {
    if (scrollReq === 0) return;
    const main = mainRef.current;
    if (!main) return;
    main.scrollIntoView({ block: "start", behavior: smooth() });
    main.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [scrollReq]);

  const go = useCallback((s: Step) => {
    dispatch({ type: "goto", step: s });
    // The list can change between steps, so a highlight by position would land on the wrong note.
    setActive(null);
    setSheet(null);
    setScrollReq((n) => n + 1);
  }, []);

  /** Runs after the phone sheet has closed and the browser has put focus back, so this focus wins. */
  function afterSheet(fn: () => void) {
    window.setTimeout(fn, 80);
  }

  function resetView() {
    setActive(null);
    setExpanded(new Set());
    setTab("problems");
    setSheet(null);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileState({ kind: "reading", message: `Reading ${file.name}…` });
    try {
      const text = await extractPlanText(file);
      if (!text.trim()) throw new ExtractError(`${file.name} has no text Plan Check can read. Paste the text instead.`);
      dispatch({ type: "loadPlan", plan: text });
      resetView();
      setFileState({
        kind: "done",
        message: `Read ${countWords(text).toLocaleString("en-US")} words from ${file.name}.`,
      });
      setScrollReq((n) => n + 1);
    } catch (e) {
      setFileState({
        kind: "error",
        message: e instanceof ExtractError ? e.message : `${file.name} could not be read. Paste the text instead.`,
      });
    }
  }

  function loadSample(s: Sample) {
    dispatch({ type: "loadSample", plan: s.plan, profile: s.profile, dates: s.dates, deadline: s.deadline });
    resetView();
    setFileState({ kind: "idle", message: "" });
    setScrollReq((n) => n + 1);
  }

  function clearAll() {
    dispatch({ type: "clear" });
    resetView();
    setFileState({ kind: "idle", message: "" });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing saved to remove.
    }
    setScrollReq((n) => n + 1);
  }

  function pasteInstead() {
    dispatch({ type: "goto", step: 1 });
    mainRef.current?.scrollIntoView({ block: "start", behavior: smooth() });
    requestAnimationFrame(() => textRef.current?.focus({ preventScroll: true }));
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** A mark (or a note about the whole plan) was chosen. Desktop: open its note in place. Phone: open the sheet. */
  function selectFinding(i: number) {
    setActive(i);
    const f = visible[i];
    if (!f) return;
    if (!wide) {
      setSheet(i);
      return;
    }
    setTab("problems");
    setExpanded((prev) => new Set(prev).add(findingKey(f)));
    requestAnimationFrame(() => {
      const box = reportScrollRef.current;
      const el = document.getElementById(`finding-${i}`);
      if (!box || !el) return;
      const header = box.querySelector<HTMLElement>("[data-report-header]")?.offsetHeight ?? 0;
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - header - 8;
      box.scrollTo({ top, behavior: smooth() });
      el.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus({ preventScroll: true });
    });
  }

  function showInPlan(i: number) {
    setActive(i);
    setSheet(null);
    if (!wide) setTab("plan");
    requestAnimationFrame(() => {
      const mark = document.getElementById(`mark-${i}`);
      mark?.scrollIntoView({ block: "center", behavior: smooth() });
      mark?.focus({ preventScroll: true });
    });
  }

  function dismiss(key: string) {
    const fromSheet = sheet !== null;
    dispatch({ type: "dismiss", key });
    setActive(null);
    setSheet(null);
    // The dismissed note and its mark leave the page, so move focus to the counts, which just changed.
    afterSheet(() => {
      if (fromSheet || !document.activeElement || document.activeElement === document.body) {
        document.getElementById("summary-title")?.focus({ preventScroll: fromSheet });
      }
    });
  }

  const words = countWords(state.plan);
  const sheetFinding = sheet !== null ? (visible[sheet] ?? null) : null;

  // ---------------------------------------------------------------- pieces
  const legend = (
    <p className="max-w-prose text-sm text-pencil">
      <span className="mk mk-fix">Red pen</span> means fix, <span className="mk mk-warn">highlighter</span> means review,{" "}
      <span className="mk mk-verify">pencil</span> means verify. Select a mark to read its note.
    </p>
  );

  const unmarkedList =
    unmarked.length > 0 ? (
      <details className="mt-3 border-y border-rule">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">
          {unmarked.length === 1 ? "1 note is" : `${unmarked.length} notes are`} not tied to a sentence
        </summary>
        <ul className="list-none p-0 pb-2">
          {unmarked.map(({ f, i }) => (
            <li key={findingKey(f)}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 text-left hover:underline"
                onClick={() => selectFinding(i)}
              >
                <span className="w-14 shrink-0 text-sm font-bold">{SEVERITY_LABEL[f.severity]}</span>
                <span className="min-w-0">{f.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    ) : null;

  const planHeader = (
    <div className="flex flex-wrap items-center justify-between gap-x-4">
      <h3 className="font-display text-xl font-bold">Your plan, marked up</h3>
      <button type="button" className="link-btn no-print" onClick={() => go(1)}>
        Edit the text
      </button>
    </div>
  );

  const planView = (
    <>
      {planHeader}
      {legend}
      {unmarkedList}
      <div className="sheet mt-3">
        <AnnotatedPlan segments={segments} activeFinding={active} onSelect={selectFinding} />
      </div>
    </>
  );

  const reportFooter = (
    <div className="no-print mt-10 border-t border-rule pt-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <ClearButton onClear={clearAll} />
      </div>
      <p className="mt-2 max-w-prose text-sm text-pencil">
        Your plan, ticks and dates are saved in this browser only, so they are here when you come back. Clear my data removes them.
      </p>
      {AI_REVIEW ? (
        <div className="mt-10">
          <AiReview plan={state.plan} />
        </div>
      ) : null}
    </div>
  );

  const reportProps = {
    report: report!,
    visible,
    dismissed,
    counts,
    marked,
    active,
    expanded,
    tab: currentTab,
    onTab: setTab,
    onToggle: toggleExpanded,
    onShowInPlan: showInPlan,
    onDismiss: dismiss,
    onRestore: (key: string) => {
      dispatch({ type: "restoreFinding", key });
      setActive(null);
    },
    onAddDates: () => go(2),
    stickyHeader: true,
    footer: reportFooter,
  };

  // ---------------------------------------------------------------- render
  return (
    <>
      <Hero
        onFile={readFile}
        onPaste={pasteInstead}
        onSample={() => loadSample(WEAK_SAMPLE)}
        saved={hasPlan}
        onResume={() => go(state.step)}
        busy={fileState.kind === "reading"}
        error={fileState.kind === "error" ? fileState.message : ""}
      />

      <main id="check" ref={mainRef} className="border-t-2 border-ink pt-5">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6">
          <Stepper step={step} canAdvance={hasPlan} onGo={go} />

          {/* ------------------------------------------------ step 1: the plan */}
          {step === 1 ? (
            <section aria-labelledby="step1-title" className="mt-5 max-w-3xl">
              <h2 id="step1-title" data-step-heading tabIndex={-1} className="font-display text-[1.75rem] font-bold">
                Your research plan
              </h2>
              <p className="mt-2 max-w-prose text-pencil">
                Upload your plan as a PDF or Word file, or paste it below. Files are read on your computer. Nothing is uploaded
                {AI_REVIEW ? " unless you use the optional AI review" : ""}.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <input
                  id="plan-file"
                  type="file"
                  accept={ACCEPT}
                  className="visually-hidden"
                  onChange={(e) => {
                    readFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="plan-file" className="btn cursor-pointer">
                  Upload PDF or Word file
                </label>
                <span className="hidden text-sm text-pencil sm:inline">or drop the file on the box below</span>
              </div>
              <p
                className={`mt-2 min-h-[1.5em] max-w-prose text-sm ${fileState.kind === "error" ? "font-bold text-red-pen" : "text-pencil"}`}
                role="status"
                aria-live="polite"
              >
                {fileState.message}
              </p>

              <div
                className={`sheet mt-1 ${dragging ? "outline-[3px] outline-dashed outline-offset-2 outline-[var(--focus)]" : ""}`}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("Files")) {
                    e.preventDefault();
                    setDragging(true);
                  }
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  if (e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    setDragging(false);
                    readFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <label htmlFor="plan" className="visually-hidden">
                  Your research plan text
                </label>
                <textarea
                  id="plan"
                  ref={textRef}
                  value={state.plan}
                  onChange={(e) => dispatch({ type: "setPlan", plan: e.target.value })}
                  placeholder="Paste your research plan here, or drop a PDF or Word file on this box."
                  rows={16}
                  spellCheck
                  className="block min-h-[20rem] w-full resize-y border-0 bg-transparent px-5 py-5 text-[1.0625rem] leading-[1.85] text-ink outline-none placeholder:text-pencil focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--focus)]"
                />
              </div>
              <p className="mt-2 text-right text-sm text-pencil">
                {words.toLocaleString("en-US")} {words === 1 ? "word" : "words"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-solid" onClick={() => go(2)} disabled={!hasPlan}>
                  Continue
                </button>
                {hasData(state) ? <ClearButton onClear={clearAll} /> : null}
              </div>
              {hasData(state) ? (
                <p className="mt-2 max-w-prose text-sm text-pencil">Saved in this browser only, so your work is here when you come back.</p>
              ) : null}

              <div className="mt-8 border-t border-rule pt-4">
                <p className="font-bold">No plan handy? Try a sample.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[WEAK_SAMPLE, STRONG_SAMPLE].map((s) => (
                    <button key={s.id} type="button" className="btn" onClick={() => loadSample(s)}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 max-w-prose text-sm text-pencil">Both samples are invented. Loading one replaces the text above.</p>
              </div>
            </section>
          ) : null}

          {/* ------------------------------------------------ step 2: confirm */}
          {step === 2 ? (
            <section aria-labelledby="step2-title" className="mt-5">
              <h2 id="step2-title" data-step-heading tabIndex={-1} className="font-display text-[1.75rem] font-bold">
                Confirm the details
              </h2>
              <p className="mt-1 max-w-prose text-pencil">Two quick checks, so the report and the forms fit your project.</p>
              <div className="flex flex-wrap items-center gap-x-4">
                {fileState.kind === "done" ? <p className="text-pencil">{fileState.message}</p> : null}
                <button type="button" className="link-btn" onClick={() => go(1)}>
                  See or edit the text
                </button>
              </div>

              <div className="mt-5 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ProfilePicker
                  profile={profile}
                  detected={detected}
                  onChange={(key: keyof Profile, value: boolean) => dispatch({ type: "setTick", key, value })}
                />
                <DatesPanel
                  profile={profile}
                  dates={state.dates}
                  deadline={state.deadline}
                  onDate={(key, value) => dispatch({ type: "setDate", key, value })}
                  onDeadline={(value) => dispatch({ type: "setDeadline", value })}
                  fromPlan={report?.planDates}
                />
              </div>

              {/* Pinned to the bottom of the screen, so every tick or date visibly changes the result. */}
              <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t-2 border-ink bg-paper px-4 py-3 sm:-mx-6 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="hidden text-sm text-pencil sm:block">Your report so far</p>
                    <p className="font-display text-lg font-bold leading-tight">{report ? <Summary counts={counts} /> : null}</p>
                    {report && report.needed.length > 0 ? (
                      <p className="hidden text-sm text-pencil sm:block">
                        {report.needed.length} {report.needed.length === 1 ? "date is" : "dates are"} still needed from you. You can add them later.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn" onClick={() => go(1)}>
                      Back
                    </button>
                    <button type="button" className="btn btn-solid" onClick={() => go(3)}>
                      See my report
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* ------------------------------------------------ step 3: report */}
          {step === 3 && report ? (
            <section aria-labelledby="step3-title" className="mt-5">
              <h2 id="step3-title" data-step-heading tabIndex={-1} className="visually-hidden">
                Your report
              </h2>

              {wide ? (
                <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-start gap-10">
                  <div className="no-print min-w-0 pb-40">{planView}</div>
                  <div
                    ref={reportScrollRef}
                    className="report-scroll sheet sticky top-4 max-h-[calc(100vh-2rem)] min-w-0 overflow-y-auto"
                  >
                    <ReportView {...reportProps} />
                  </div>
                </div>
              ) : (
                <div className="sheet -mx-1">
                  <ReportView {...reportProps} planPanel={<div className="mt-4">{planView}</div>} />
                </div>
              )}

              <FindingSheet
                finding={sheetFinding}
                marked={sheet !== null && marked.has(sheet)}
                onClose={() => setSheet(null)}
                onDismiss={() => {
                  if (sheetFinding) dismiss(findingKey(sheetFinding));
                }}
                onSeeAll={() => {
                  const i = sheet;
                  setSheet(null);
                  setTab("problems");
                  if (i !== null && visible[i]) {
                    setExpanded((prev) => new Set(prev).add(findingKey(visible[i])));
                    afterSheet(() => {
                      const row = document.getElementById(`finding-${i}`);
                      row?.scrollIntoView({ block: "start", behavior: smooth() });
                      row?.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus({ preventScroll: true });
                    });
                  }
                }}
              />
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
