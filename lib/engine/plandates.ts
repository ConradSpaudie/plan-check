import { sentences, words } from "./text";
import type { PlanDates } from "./types";

/**
 * Finds the experiment start date, end date and fair deadline written in the plan itself,
 * so a student who already wrote "Experimentation will begin November 2, 2026" is not
 * asked to type it again. US month/day order is assumed for numeric dates.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

const MONTH_NAMES = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

/** One regex for every date shape we accept. Groups are read in `toIso`. */
const DATE = new RegExp(
  [
    `\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b`, // 2026-11-02
    `\\b(\\d{1,2})[/.](\\d{1,2})[/.](\\d{2}|\\d{4})\\b`, // 11/2/2026, 11/02/26
    `\\b(${MONTH_NAMES})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, // November 2, 2026
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})\\.?,?\\s+(\\d{4})\\b`, // 2 November 2026
  ].join("|"),
  "gi",
);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function valid(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function toIso(m: RegExpMatchArray): string | null {
  if (m[1]) return valid(+m[1], +m[2], +m[3]);
  if (m[4]) {
    const y = m[6].length === 2 ? 2000 + +m[6] : +m[6];
    return valid(y, +m[4], +m[5]);
  }
  if (m[7]) return valid(+m[9], MONTHS[m[7].toLowerCase().replace(/\.$/, "")] ?? 0, +m[8]);
  if (m[10]) return valid(+m[12], MONTHS[m[11].toLowerCase().replace(/\.$/, "")] ?? 0, +m[10]);
  return null;
}

const START_CUE =
  /\b(start(s|ing)?|begin(s|ning)?|began|commenc\w*|first session|data collection (will )?(start|begin)s?|experimentation (will )?(start|begin)s?)\b/i;
const END_CUE = /\b(end(s|ing)?|finish(es|ing)?|conclud\w*|complet\w*|last session|wrap up)\b/i;
const DEADLINE_CUE = /\b(deadline|due( date)?|submit(ted)? by|pre-?approval)\b/i;
const EXPERIMENT_CUE = /\b(experiment\w*|data collection|sessions?|intervention|testing|trials?|study|research|project)\b/i;
/** Dates that belong to something else: when the plan was written, when a source was published or read. */
const IGNORE_CUE = /\b(retrieved|accessed|published|today'?s date|date of (this )?plan|written on|revised|updated)\b/i;

/** The word just before a date, to tell which cue applies when a sentence holds two dates. */
function cueBefore(sentence: string, index: number): "start" | "end" | "deadline" | null {
  const before = sentence.slice(Math.max(0, index - 60), index);
  const last = (re: RegExp) => {
    let pos = -1;
    for (const m of before.matchAll(new RegExp(re.source, "gi"))) pos = m.index ?? pos;
    return pos;
  };
  const s = last(START_CUE);
  const e = last(END_CUE);
  const d = last(DEADLINE_CUE);
  const best = Math.max(s, e, d);
  if (best < 0) return null;
  return best === d ? "deadline" : best === e ? "end" : "start";
}

export function extractPlanDates(text: string): PlanDates {
  const out: PlanDates = {};
  for (const s of sentences(text)) {
    if (IGNORE_CUE.test(s)) continue;
    const found = Array.from(s.matchAll(DATE))
      .map((m) => ({ iso: toIso(m), index: m.index ?? 0 }))
      // Only this project's own dates: older years are almost always cited studies.
      .filter((x): x is { iso: string; index: number } => x.iso !== null && x.iso >= "2025-01-01" && x.iso < "2031-01-01");
    if (found.length === 0) continue;

    // "from November 2, 2026 to December 15, 2026", "between ... and ...", "Dates of experimentation: X to Y"
    const rangeCue = /\b(from|between|dates?|runs?|window)\b/i.test(s.slice(0, found[0].index + 1));
    if (found.length >= 2 && EXPERIMENT_CUE.test(s) && rangeCue && !DEADLINE_CUE.test(s) && found[1].iso >= found[0].iso && !cueBefore(s, found[1].index)?.match(/start/)) {
      out.start ??= { iso: found[0].iso, sentence: s };
      out.end ??= { iso: found[1].iso, sentence: s };
      continue;
    }

    for (const f of found) {
      const cue = cueBefore(s, f.index);
      if (!cue) continue;
      if (cue === "deadline") out.deadline ??= { iso: f.iso, sentence: s };
      // A labelled line like "Start date: 11/2/2026" counts; a stray "ends" in a long sentence about something else does not.
      else if (EXPERIMENT_CUE.test(s) || /\b(planned|proposed)\b/i.test(s) || words(s) <= 8) {
        if (cue === "start") out.start ??= { iso: f.iso, sentence: s };
        else out.end ??= { iso: f.iso, sentence: s };
      }
    }
  }
  return out;
}
