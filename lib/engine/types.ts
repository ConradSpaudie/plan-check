export type Severity = "fix" | "warn" | "verify";

export type GroupId =
  | "dates"
  | "forms"
  | "structure"
  | "procedure"
  | "safety"
  | "analysis"
  | "bibliography"
  | "human"
  | "animals"
  | "bio"
  | "computational"
  | "ai";

export type CheckKind = "deterministic" | "heuristic" | "cross-form";

export interface SourceRef {
  label: string;
  url: string;
}

export interface Finding {
  /** Rubric id from the research report, for example "B3". */
  id: string;
  group: GroupId;
  severity: Severity;
  kind: CheckKind;
  /** One short sentence stating the problem. */
  title: string;
  /** What the checker actually saw. */
  detail: string;
  /** Why an SRC reviewer cares. */
  why: string;
  /** Exact sentences or snippets from the student's plan. Never rewritten. */
  evidence?: string[];
  /** A question for the student. The tool never supplies replacement text. */
  askYourself?: string;
  sources: SourceRef[];
}

export interface Profile {
  humans: boolean;
  vertebrates: boolean;
  /** Potentially hazardous biological agents (microorganisms, tissue, rDNA). */
  phba: boolean;
  /** Hazardous chemicals, activities or devices. */
  hazards: boolean;
  /** Work done at a regulated research institution or other non-home/school/field site. */
  outsideSite: boolean;
  continuation: boolean;
  team: boolean;
  usesAI: boolean;
}

/** All dates are ISO strings: YYYY-MM-DD. Empty string or undefined means not entered. */
export interface FormDates {
  start?: string;
  end?: string;
  f1?: string;
  f1B_student?: string;
  f1B_parent?: string;
  /** Form 1B prior approval by the SRC or IRB. */
  f1B_approval?: string;
  f2B?: string;
  f3?: string;
  f4?: string;
  f5A?: string;
  f6A?: string;
  f2C?: string;
  f5B?: string;
  f7?: string;
  /** Final SRC review before competition (Form 1B section 3). */
  finalSrc?: string;
}

export interface CheckInput {
  plan: string;
  profile: Profile;
  dates: FormDates;
  /** ISO date. Defaults to the real today. Tests pass a fixed value. */
  today?: string;
  /** The student's fair pre-approval deadline, ISO date. */
  deadline?: string;
}

export interface SectionInfo {
  id: SectionId;
  label: string;
  /** True when a heading was found. */
  hasHeading: boolean;
  /** True when no heading was found but the content looks present. */
  keywordOnly: boolean;
  words: number;
}

export type SectionId =
  | "rationale"
  | "question"
  | "materials"
  | "procedure"
  | "safety"
  | "analysis"
  | "bibliography"
  | "ack";

export interface Hit {
  term: string;
  sentence: string;
}

export interface Detections {
  humans: Hit[];
  vertebrates: Hit[];
  phba: Hit[];
  hazards: Hit[];
  outsideSite: Hit[];
  continuation: Hit[];
  qualifiedScientist: Hit[];
  minors: Hit[];
  dataset: Hit[];
  identifiers: Hit[];
  aiUsed: Hit[];
}

export interface FormNeed {
  id: string;
  name: string;
  /** Pre-2026-27 numbering, if it changed. */
  legacy?: string;
  why: string;
  signedBy: string;
  timing: "before" | "after" | "either";
}

export interface SignatureStep {
  n: number;
  title: string;
  detail: string;
}

export interface PassItem {
  id: string;
  title: string;
}

export interface Report {
  findings: Finding[];
  fixFirst: Finding[];
  passes: PassItem[];
  formsNeeded: FormNeed[];
  steps: SignatureStep[];
  detected: Detections;
  sections: SectionInfo[];
  wordCount: number;
  counts: { fix: number; warn: number; verify: number };
}
