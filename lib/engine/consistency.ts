import type { Parsed } from "./sections";
import { headingOf } from "./sections";
import { SRC } from "./sources";
import { clip, matchAll, sentences } from "./text";
import { bibEntries } from "./plan";
import type { Finding, PassItem, Profile } from "./types";

export interface Out {
  findings: Finding[];
  passes: PassItem[];
}

/**
 * Consistency checks: places where the plan disagrees with itself.
 * Reviewers read the whole plan, so a number that changes between sections reads as carelessness
 * or as a procedure nobody has thought through.
 */

/* ------------------------------------------------- D9a: step numbers that do not exist */

function stepNumbersPresent(lines: string[]): Set<number> {
  const out = new Set<number>();
  for (const line of lines) {
    if (headingOf(line)) continue;
    const m = /^\s*(\d{1,2})[.)]\s+\S/.exec(line);
    if (m) out.add(parseInt(m[1], 10));
  }
  return out;
}

function stepReferences(text: string): { n: number; sentence: string }[] {
  const refs: { n: number; sentence: string }[] = [];
  for (const s of sentences(text)) {
    for (const m of matchAll(/\bsteps?\s+(\d{1,2})(?:\s*(?:-|–|to|through)\s*(\d{1,2}))?/gi, s)) {
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      if (b < a || b - a > 40) continue;
      for (let k = a; k <= b; k++) refs.push({ n: k, sentence: s });
    }
  }
  return refs;
}

export function checkStepReferences(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const refs = stepReferences(parsed.body);
  if (refs.length === 0) return { findings, passes };
  const present = stepNumbersPresent(parsed.lines);
  const missing = Array.from(new Set(refs.filter((r) => !present.has(r.n)).map((r) => r.n))).sort((a, b) => a - b);
  if (missing.length === 0) {
    passes.push({ id: "D9", title: "Every step the plan refers to is numbered" });
    return { findings, passes };
  }
  const shown = Array.from(present).sort((a, b) => a - b);
  findings.push({
    id: "D9",
    group: "procedure",
    severity: "warn",
    kind: "deterministic",
    title: `The plan refers to ${missing.length === 1 ? "step" : "steps"} ${rangeText(missing)}, but ${missing.length === 1 ? "that step is" : "those steps are"} not numbered`,
    detail:
      shown.length > 0
        ? `Numbered steps found: ${rangeText(shown)}. If your document uses automatic list numbering, the numbers may have been lost when it was copied or exported.`
        : "No numbered steps were found. If your document uses automatic list numbering, the numbers may have been lost when it was copied or exported.",
    why: "A reviewer following a cross-reference to a step that is not there cannot check what you meant.",
    evidence: Array.from(new Set(refs.filter((r) => missing.includes(r.n)).map((r) => clip(r.sentence)))).slice(0, 2),
    askYourself: "Open the file you will actually submit. Are the step numbers visible there?",
    sources: [SRC.floridaDirections],
  });
  return { findings, passes };
}

function rangeText(nums: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(j > i ? `${nums[i]}-${nums[j]}` : `${nums[i]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/* ------------------------------------------------- D9b: claimed reference count */

export function checkReferenceCount(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const info = parsed.info.find((i) => i.id === "bibliography")!;
  if (!info.hasHeading || info.words === 0) return { findings, passes };
  const n = bibEntries(parsed.sections.bibliography).length;
  for (const s of sentences(parsed.body)) {
    const m = /\b(\d{1,3})\s+(references|sources|citations|bibliography entries)\b/i.exec(s);
    if (!m) continue;
    const claimed = parseInt(m[1], 10);
    if (claimed !== n) {
      findings.push({
        id: "D9",
        group: "bibliography",
        severity: "warn",
        kind: "deterministic",
        title: `The plan says ${claimed} ${m[2].toLowerCase()}, but the bibliography has ${n}`,
        detail: "Plan Check counted the entries under your bibliography heading. Recount, then make the number match.",
        why: "Small mismatches like this tell a reviewer the plan was not checked as a whole.",
        evidence: [clip(s)],
        sources: [SRC.floridaSupplement],
      });
    } else {
      passes.push({ id: "D9", title: "The reference count you state matches the bibliography" });
    }
    break;
  }
  return { findings, passes };
}

/* ------------------------------------------------- A6: forms mentioned but not needed */

const FORM_NEEDS: { re: RegExp; form: string; needed: (p: Profile) => boolean; because: string }[] = [
  { re: /\bForm\s*3\b/i, form: "Form 3", needed: (p) => p.hazards || p.phba, because: "the project uses hazardous chemicals, activities, devices or biological agents" },
  { re: /\bForm\s*4\b/i, form: "Form 4", needed: (p) => p.humans, because: "people take part" },
  { re: /\bForm\s*5A\b/i, form: "Form 5A", needed: (p) => p.vertebrates, because: "live vertebrate animals are used" },
  { re: /\bForm\s*5B\b/i, form: "Form 5B", needed: (p) => p.vertebrates, because: "live vertebrate animals are used at an institution" },
  { re: /\bForm\s*6A\b/i, form: "Form 6A", needed: (p) => p.phba, because: "the project uses potentially hazardous biological agents" },
  { re: /\bForm\s*6B\b/i, form: "Form 6B", needed: (p) => p.phba, because: "the project uses human or animal tissue" },
  { re: /\bForm\s*2C\b/i, form: "Form 2C", needed: (p) => p.outsideSite, because: "work is done at a regulated research institution" },
  { re: /\bForm\s*7\b/i, form: "Form 7", needed: (p) => p.continuation, because: "the project continues earlier work" },
];

export function checkFormsMentioned(plan: string, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const sents = sentences(plan);
  for (const f of FORM_NEEDS) {
    if (f.needed(profile)) continue;
    const hit = sents.find((s) => f.re.test(s));
    if (!hit) continue;
    findings.push({
      id: "A6",
      group: "forms",
      severity: "verify",
      kind: "cross-form",
      title: `Your plan mentions ${f.form}, but nothing you ticked needs it`,
      detail: `${f.form} is usually only needed when ${f.because}. Either the plan is missing something, a box above should be ticked, or the mention should go.`,
      why: "Forms that do not match the plan are a common reason for return, and they make a reviewer look for hazards or procedures that are not described.",
      evidence: [clip(hit)],
      askYourself: `Does your project really need ${f.form}? If not, which form did you mean?`,
      sources: [SRC.formsPage, SRC.commonProblems],
    });
  }
  return { findings, passes };
}

/* ------------------------------------------------- D9c: sessions longer than their slots */

export function checkSessionLength(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const sents = sentences(parsed.body);
  let slot: { minutes: number; sentence: string } | null = null;
  let longest: { minutes: number; sentence: string } | null = null;
  for (const s of sents) {
    const sm = /\b(\d{1,3})[- ]minutes?\s+(time\s+)?slots?\b/i.exec(s);
    if (sm && !slot) slot = { minutes: parseInt(sm[1], 10), sentence: s };
    if (/\bsessions?\b/i.test(s)) {
      for (const m of matchAll(/\b(\d{1,3})\s*(?:to|-|–)\s*(\d{1,3})\s*minutes?\b/gi, s)) {
        const hi = parseInt(m[2], 10);
        if (!longest || hi > longest.minutes) longest = { minutes: hi, sentence: s };
      }
    }
  }
  if (slot && longest && longest.minutes > slot.minutes) {
    findings.push({
      id: "D9",
      group: "procedure",
      severity: "warn",
      kind: "deterministic",
      title: `Sessions can run ${longest.minutes} minutes, but the time slots are ${slot.minutes} minutes`,
      detail: "Back-to-back participants would overlap, or later participants would wait longer than the plan says.",
      why: "Reviewers check that the schedule is possible, especially for minors who must be supervised the whole time.",
      evidence: [clip(slot.sentence), clip(longest.sentence)],
      askYourself: "Write out the real timetable for one afternoon. When does the last child start and finish?",
      sources: [SRC.human],
    });
  }
  return { findings, passes };
}
