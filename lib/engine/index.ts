import { checkAnimals, checkBio, checkComputational, checkHuman } from "./branches";
import { checkDates } from "./dates";
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
import type { CheckInput, Finding, GroupId, PassItem, Report, Severity } from "./types";

export * from "./types";
export { detect, suggestProfile, emptyProfile } from "./detect";
export { formsNeeded, signatureSteps, LEGACY_FORM_MAP } from "./forms";
export { SRC } from "./sources";

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

/** What the plan mentions, for the UI to auto-tick the profile. */
export function detectFromPlan(plan: string) {
  const parsed = parsePlan(plan ?? "");
  return detect(parsed.body || plan || "");
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
  const detected = detect(parsed.body || plan);
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const withToday: CheckInput = { ...input, today };

  const outs = [
    checkFormNumbers(plan),
    checkRouting(detected, input.profile),
    checkDates(withToday),
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
  ];

  const findings = sortFindings(outs.flatMap((o) => o.findings));
  const passes: PassItem[] = outs.flatMap((o) => o.passes);
  const counts = { fix: 0, warn: 0, verify: 0 };
  for (const f of findings) counts[f.severity]++;

  const fixFirst = findings.filter((f) => f.severity !== "verify").slice(0, 3);

  return {
    findings,
    fixFirst,
    passes,
    formsNeeded: formsNeeded(input.profile),
    steps: signatureSteps(input.profile),
    detected,
    sections: parsed.info,
    wordCount,
    counts,
  };
}
