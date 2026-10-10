import { SRC } from "./sources";
import type { CheckInput, Finding, FormDates, PassItem, Profile } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function isIso(s: string | undefined): s is string {
  return !!s && ISO.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

function toMs(s: string): number {
  return Date.parse(s + "T00:00:00Z");
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / 86_400_000);
}

/** Whole calendar months from a to b, rounded down. */
export function monthsBetween(a: string, b: string): number {
  const da = new Date(toMs(a));
  const db = new Date(toMs(b));
  let m = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
  if (db.getUTCDate() < da.getUTCDate()) m -= 1;
  return m;
}

/** Same calendar day one year later, as an ISO string. */
export function plusYear(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  const next = new Date(Date.UTC(y + 1, m - 1, d));
  // Feb 29 rolls to Mar 1 in a non-leap year; step back so the limit stays in February.
  if (next.getUTCMonth() !== m - 1) next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}

export function fmt(s: string): string {
  const [y, m, d] = s.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

interface BeforeForm {
  key: keyof FormDates;
  label: string;
  needed: (p: Profile) => boolean;
  because: string;
  source: (typeof SRC)[keyof typeof SRC];
}

const needsPriorApproval = (p: Profile) => p.humans || p.vertebrates || p.phba;

const BEFORE_FORMS: BeforeForm[] = [
  { key: "f1", label: "Form 1 (Adult Sponsor checklist)", needed: () => true, because: "it is required for every project", source: SRC.form1 },
  { key: "f1B_student", label: "Form 1B (student signature)", needed: () => true, because: "it is required for every project", source: SRC.form1B },
  { key: "f1B_parent", label: "Form 1B (parent or guardian signature)", needed: () => true, because: "it is required for every project", source: SRC.form1B },
  { key: "f1B_approval", label: "Form 1B (SRC or IRB prior approval)", needed: needsPriorApproval, because: "your project needs prior approval", source: SRC.form1B },
  { key: "f2B", label: "Form 2B (Qualified Scientist)", needed: () => false, because: "a Qualified Scientist is involved", source: SRC.rulesAll },
  { key: "f3", label: "Form 3 (Risk Assessment)", needed: (p) => p.hazards || p.phba, because: "your project involves hazards", source: SRC.charlotte },
  { key: "f4", label: "Form 4 (Human Participants)", needed: (p) => p.humans, because: "your project involves human participants", source: SRC.form4 },
  { key: "f5A", label: "Form 5A (Vertebrate Animals)", needed: (p) => p.vertebrates && !p.outsideSite, because: "your project involves live vertebrates", source: SRC.rulesAll },
  { key: "f6A", label: "Form 6A (Hazardous Biological Agents)", needed: (p) => p.phba, because: "your project involves biological agents", source: SRC.phba },
];

export function checkDates(input: CheckInput): { findings: Finding[]; passes: PassItem[] } {
  const { profile, dates, today, deadline } = input;
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const start = isIso(dates.start) ? dates.start : undefined;
  const end = isIso(dates.end) ? dates.end : undefined;

  // B2: the anchor date
  if (!start) {
    findings.push({
      id: "B2",
      group: "dates",
      severity: "warn",
      kind: "deterministic",
      title: "Enter your planned experiment start date",
      detail:
        "Every form date is checked against the start date on Form 1A. Without it, Plan Check cannot test signature order.",
      why: "Reviewers check that forms were signed before experimentation began. Wrong order is the 'bad dates' problem on the Society's own list.",
      sources: [SRC.commonProblems, SRC.charlotte],
    });
  }

  if (start && !end) {
    findings.push({
      id: "B2",
      group: "dates",
      severity: "verify",
      kind: "deterministic",
      title: "Add a planned end date",
      detail: "Form 1A asks for proposed start and end dates. The end date also decides when after-the-fact forms are signed.",
      why: "Incomplete Form 1A dates are the top paperwork problem on the Society's list.",
      sources: [SRC.commonProblems],
    });
  }

  if (start && end && end < start) {
    findings.push({
      id: "B2",
      group: "dates",
      severity: "fix",
      kind: "deterministic",
      title: "Your end date is before your start date",
      detail: `Start ${fmt(start)}, end ${fmt(end)}.`,
      why: "Form 1A dates must be coherent for the SRC to check the order of everything else.",
      sources: [SRC.commonProblems],
    });
  }

  if (start) {
    // B3: forms that must be dated strictly before the start date
    let anyChecked = false;
    let allOk = true;
    for (const f of BEFORE_FORMS) {
      const raw = dates[f.key];
      const val = isIso(raw) ? raw : undefined;
      const needed = f.needed(profile);
      if (!val) {
        if (needed) {
          allOk = false;
          findings.push({
            id: "B3",
            group: "dates",
            severity: "warn",
            kind: "cross-form",
            title: `${f.label} has no date yet`,
            detail: `You need this form because ${f.because}. It must be signed and dated before ${fmt(start)}, your start date.`,
            why: "Experimentation cannot begin until the required forms are signed and approved.",
            askYourself: "Is this form signed yet? If not, you cannot start on that date.",
            sources: [f.source, SRC.charlotte],
          });
        }
        continue;
      }
      anyChecked = true;
      if (val >= start) {
        allOk = false;
        findings.push({
          id: "B3",
          group: "dates",
          severity: "fix",
          kind: "cross-form",
          title: `${f.label} is dated ${fmt(val)}, which is not before your start date ${fmt(start)}`,
          detail:
            val === start
              ? "Same-day dates are risky. The rules say these forms must be dated before experimentation begins."
              : `That is ${days(daysBetween(start, val))} after your start date.`,
          why: "Forms must be signed in the right order before experimentation begins. Reviewers return packets with 'bad dates'.",
          askYourself:
            "Is the start date on Form 1A wrong, or was the form signed late? Do not change a date to make it fit. If work already started, stop and ask your SRC.",
          sources: [f.source, SRC.commonProblems, SRC.charlotte],
        });
      }
    }
    if (anyChecked && allOk) {
      passes.push({ id: "B3", title: "Every dated form is before your start date" });
    }

    // Already started?
    if (today && isIso(today) && start <= today) {
      const missing = BEFORE_FORMS.filter((f) => f.needed(profile) && !isIso(dates[f.key]));
      if (missing.length > 0) {
        findings.push({
          id: "B6",
          group: "dates",
          severity: "fix",
          kind: "cross-form",
          title: "Your start date has passed but required forms are undated",
          detail: `Missing dates: ${missing.map((m) => m.label).join(", ")}.`,
          why: "Experimentation, including recruiting and surveying, cannot begin before the required approvals. Projects that started early can fail to qualify.",
          askYourself:
            "Have you collected any data yet? If so, stop and email your fair SRC. The rules booklet points to src@societyforscience.org for special situations, and no retroactive approval process is documented.",
          sources: [SRC.failToQualify, SRC.rulesAll],
        });
      }
    }

    // Short runway
    if (today && isIso(today) && start > today) {
      const gap = daysBetween(today, start);
      const missingApproval = needsPriorApproval(profile) && !isIso(dates.f1B_approval);
      if (missingApproval && gap < 14) {
        findings.push({
          id: "B9",
          group: "dates",
          severity: "warn",
          kind: "heuristic",
          title: `Your start date is ${days(gap)} away and prior approval is not dated`,
          detail:
            "Society-derived guidance says SRCs should review within two weeks of receipt. Corrections add more time, and some fairs allow only one resubmission.",
          why: "A first-round return can push your approval past your start date.",
          sources: [SRC.srcGuidelines],
        });
      }
    }
  }

  // After-experimentation forms
  if (end) {
    const afters: { key: keyof FormDates; label: string; needed: boolean; src: (typeof SRC)[keyof typeof SRC] }[] = [
      { key: "f2C", label: "Form 2C (Regulated Research Institution)", needed: profile.outsideSite, src: SRC.form2C },
      { key: "f5B", label: "Form 5B (Vertebrate Animals, regulated institution)", needed: profile.vertebrates && profile.outsideSite, src: SRC.overview },
    ];
    for (const a of afters) {
      const val = dates[a.key];
      if (isIso(val) && val < end) {
        findings.push({
          id: "B4",
          group: "dates",
          severity: "warn",
          kind: "cross-form",
          title: `${a.label} is dated ${fmt(val)}, before your end date ${fmt(end)}`,
          detail: "This form is completed after the research is done.",
          why: "Unlike most forms, this one records what happened. An early date suggests it was filled in too soon or the end date is wrong.",
          sources: [a.src, SRC.overview],
        });
      }
    }
    if (isIso(dates.finalSrc) && dates.finalSrc < end) {
      findings.push({
        id: "B4",
        group: "dates",
        severity: "fix",
        kind: "cross-form",
        title: `Final SRC review is dated ${fmt(dates.finalSrc)}, before your end date ${fmt(end)}`,
        detail: "The final review happens after experimentation and shortly before competition.",
        why: "Form 1B section 3 is the SRC's check of the finished project.",
        sources: [SRC.form1B, SRC.rulesAll],
      });
    }
  }

  // B8: judged-data window
  if (start && start < "2026-01-01") {
    findings.push({
      id: "B8",
      group: "dates",
      severity: "verify",
      kind: "deterministic",
      title: "Your start date is before January 1, 2026",
      detail:
        "Judged data must be collected within 12 continuous months, and for the 2026-27 cycle the window is reported as January 2026 to May 2027.",
      why: "Data older than the window cannot be judged.",
      askYourself: "Is this a continuation? If so, only the current year's work is judged and Form 7 explains the difference.",
      sources: [SRC.rulesAll, SRC.faq],
    });
  }
  if (start && end && end >= start && end > plusYear(start)) {
    findings.push({
      id: "B8",
      group: "dates",
      severity: "warn",
      kind: "deterministic",
      title: "Your start and end dates span more than 12 months",
      detail: `From ${fmt(start)} to ${fmt(end)}.`,
      why: "The rules limit judged research to 12 continuous months.",
      sources: [SRC.rulesAll],
    });
  }
  if (end && end > "2027-05-31") {
    findings.push({
      id: "B8",
      group: "dates",
      severity: "verify",
      kind: "deterministic",
      title: "Your end date is after May 2027",
      detail: "The research window for this cycle is reported to end in May 2027. Check with your fair.",
      why: "Data collected after the window is not judged.",
      sources: [SRC.rulesAll, SRC.faq],
    });
  }

  // B9: fair deadline
  if (deadline && isIso(deadline) && today && isIso(today)) {
    if (today > deadline) {
      findings.push({
        id: "B9",
        group: "dates",
        severity: "fix",
        kind: "deterministic",
        title: `Your fair's pre-approval deadline (${fmt(deadline)}) has passed`,
        detail: "Projects needing human, animal or biohazard approval usually have a fall deadline.",
        why: "Missing the pre-approval deadline can end your chance to compete at that fair.",
        askYourself: "Email your fair director today and ask what is still possible.",
        sources: [SRC.pittsburgh],
      });
    } else {
      const left = daysBetween(today, deadline);
      if (left <= 14) {
        findings.push({
          id: "B9",
          group: "dates",
          severity: "warn",
          kind: "deterministic",
          title: `Your fair's pre-approval deadline is in ${days(left)}`,
          detail: "SRC reviews can take about two weeks, and corrections add rounds.",
          why: "Fairs publish different and sometimes conflicting dates. Confirm the date with your fair.",
          sources: [SRC.srcGuidelines, SRC.pittsburgh],
        });
      }
    }
    if (isIso(dates.f1B_approval) && dates.f1B_approval > deadline) {
      findings.push({
        id: "B9",
        group: "dates",
        severity: "fix",
        kind: "cross-form",
        title: "Your SRC or IRB prior approval is dated after your fair's deadline",
        detail: `Approval ${fmt(dates.f1B_approval)}, deadline ${fmt(deadline)}.`,
        why: "Approval has to land before the fair's pre-approval deadline to qualify.",
        sources: [SRC.pittsburgh],
      });
    }
  }

  return { findings, passes };
}
