import { checkAnimals, checkBio, checkComputational, checkHuman } from "./branches";
import { checkFormsMentioned, checkReferenceCount, checkSessionLength, checkStepReferences } from "./consistency";
import { checkDates, fmt, isIso } from "./dates";
import { extractPlanDates } from "./plandates";
import { SRC } from "./sources";
import { detect } from "./detect";
import { formsNeeded, signatureSteps } from "./forms";
import {
  checkAI,
  checkAnalysis,
  checkBibliography,
  checkFormNumbers,
  checkProcedure,
  checkRouting,
  checkSafety,
  checkStructure,
} from "./plan";
import { parsePlan } from "./sections";
import { words } from "./text";
import type { CheckInput, Finding, GroupId, PassItem, PlanDates, Report, Severity } from "./types";

export * from "./types";
export { detect, suggestProfile, emptyProfile } from "./detect";
export { formsNeeded, signatureSteps, LEGACY_FORM_MAP } from "./forms";
export { SRC } from "./sources";
export { extractPlanDates } from "./plandates";

const SEVERITY_RANK: Record<Severity, number> = { fix: 0, warn: 1, verify: 2 };

/** Order that matters most to a reviewer. Dates and approvals first. */
const GROUP_RANK: Record<GroupId, number> = {
  dates: 0,
  forms: 1,
  human: 2,
  animals: 3,
  bio: 4,
  safety: 5,
  procedure: 6,
  structure: 7,
  bibliography: 8,
  analysis: 9,
  ai: 10,
  computational: 11,
};

/**
 * Text to scan for what the project involves. The rationale describes other people's studies
 * (universities, participants, mice), so it is left out when the plan has a procedure section.
 */
function triggerText(parsed: ReturnType<typeof parsePlan>, plan: string): string {
  const body = parsed.body || plan || "";
  const hasProcedure = parsed.info.find((i) => i.id === "procedure")?.hasHeading;
  const rationale = parsed.sections.rationale;
  if (hasProcedure && rationale && body.includes(rationale)) return body.replace(rationale, "");
  return body;
}

/** What the plan mentions, for the UI to auto-tick the profile. */
export function detectFromPlan(plan: string) {
  const parsed = parsePlan(plan ?? "");
  return detect(triggerText(parsed, plan ?? ""));
}

/** Start date, end date and fair deadline written in the plan, for the UI to fill empty date boxes. */
export function planDatesOf(plan: string) {
  const parsed = parsePlan(plan ?? "");
  return extractPlanDates(triggerText(parsed, plan ?? ""));
}

export function sortFindings(list: Finding[]): Finding[] {
  return [...list].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      GROUP_RANK[a.group] - GROUP_RANK[b.group] ||
      a.id.localeCompare(b.id),
  );
}

export function runChecks(input: CheckInput): Report {
  const plan = input.plan ?? "";
  const parsed = parsePlan(plan);
  const wordCount = words(plan);
  const detected = detect(triggerText(parsed, plan));
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  // Dates written in the plan fill any date box the student left empty.
  const planDates = extractPlanDates(triggerText(parsed, plan));
  const dateChecks = planDateChecks(input, planDates);
  const dates = { ...input.dates };
  if (!isIso(dates.start) && planDates.start) dates.start = planDates.start.iso;
  if (!isIso(dates.end) && planDates.end) dates.end = planDates.end.iso;
  const deadline = isIso(input.deadline) ? input.deadline : planDates.deadline?.iso;
  const withToday: CheckInput = { ...input, dates, deadline, today };

  const outs = [
    checkFormNumbers(plan),
    checkRouting(detected, input.profile),
    checkDates(withToday),
    dateChecks,
    checkStructure(parsed, wordCount),
    checkProcedure(parsed),
    checkSafety(parsed, detected, input.profile),
    checkAnalysis(parsed),
    checkBibliography(parsed),
    checkHuman(parsed, detected, input.profile),
    checkAnimals(parsed, detected, input.profile),
    checkBio(parsed, detected, input.profile),
    checkComputational(parsed, detected, input.profile),
    checkAI(parsed, detected, input.profile),
    checkStepReferences(parsed),
    checkReferenceCount(parsed),
    checkFormsMentioned(plan, input.profile),
    checkSessionLength(parsed),
  ];

  const all = sortFindings(outs.flatMap((o) => o.findings));
  // Missing inputs are not problems with the plan, so they stay out of the counts.
  const findings = all.filter((f) => !f.asks);
  const needed = all.filter((f) => f.asks);
  const passes: PassItem[] = outs.flatMap((o) => o.passes);
  const counts = { fix: 0, warn: 0, verify: 0 };
  for (const f of findings) counts[f.severity]++;

  const fixFirst = findings.filter((f) => f.severity !== "verify").slice(0, 3);

  return {
    findings,
    needed,
    fixFirst,
    passes,
    formsNeeded: formsNeeded(input.profile),
    steps: signatureSteps(input.profile),
    detected,
    sections: parsed.info,
    wordCount,
    counts,
    planDates,
  };
}

const DATE_LABEL = { start: "start date", end: "end date", deadline: "fair deadline" } as const;

/** B10: the plan and the date boxes should agree. */
function planDateChecks(input: CheckInput, found: PlanDates): { findings: Finding[]; passes: PassItem[] } {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const entered = { start: input.dates.start, end: input.dates.end, deadline: input.deadline };
  for (const key of ["start", "end", "deadline"] as const) {
    const f = found[key];
    if (!f) continue;
    const box = entered[key];
    if (isIso(box) && box !== f.iso) {
      findings.push({
        id: "B10",
        group: "dates",
        severity: "fix",
        kind: "cross-form",
        title: `Your plan gives the ${DATE_LABEL[key]} as ${fmt(f.iso)}, but you entered ${fmt(box)}`,
        detail: "Plan Check used the date you entered. Your plan, Form 1A and every form must use the same date.",
        why: "Dates that disagree between the plan and the forms are the 'bad dates' problem on the Society's own list.",
        evidence: [f.sentence],
        askYourself: "Which date is right? Fix the other one before you submit.",
        sources: [SRC.commonProblems, SRC.overview],
      });
    } else {
      passes.push({ id: "B10", title: `Read the ${DATE_LABEL[key]} from your plan: ${fmt(f.iso)}` });
    }
  }
  return { findings, passes };
}
