"use client";

import type { FormDates, PlanDates, Profile } from "@/lib/engine/types";

interface Row {
  key: keyof FormDates;
  label: string;
  note?: string;
  show: (p: Profile) => boolean;
}

const BEFORE: Row[] = [
  { key: "f1", label: "Form 1, adult sponsor checklist", show: () => true },
  { key: "f1B_student", label: "Form 1B, student signature", show: () => true },
  { key: "f1B_parent", label: "Form 1B, parent or guardian signature", show: () => true },
  {
    key: "f1B_approval",
    label: "Form 1B, SRC or IRB prior approval",
    show: (p) => p.humans || p.vertebrates || p.phba,
  },
  { key: "f4", label: "Form 4, human participants", note: "All three IRB members", show: (p) => p.humans },
  { key: "f5A", label: "Form 5A, vertebrate animals", show: (p) => p.vertebrates && !p.outsideSite },
  { key: "f6A", label: "Form 6A, biological agents", show: (p) => p.phba },
  { key: "f3", label: "Form 3, risk assessment", show: (p) => p.hazards || p.phba },
  {
    key: "f2B",
    label: "Form 2B, Qualified Scientist",
    note: "Was Form 2. Only if you have one.",
    show: () => true,
  },
];

const AFTER: Row[] = [
  { key: "f2C", label: "Form 2C, outside lab", note: "Was Form 1C. Signed by the site supervisor.", show: (p) => p.outsideSite },
  { key: "f5B", label: "Form 5B, animals at an institution", show: (p) => p.vertebrates && p.outsideSite },
  { key: "f7", label: "Form 7, continuation", show: (p) => p.continuation },
  { key: "finalSrc", label: "Final SRC review before the fair", note: "Form 1B section 3", show: () => true },
];

interface Props {
  profile: Profile;
  dates: FormDates;
  deadline: string;
  onDate: (key: keyof FormDates, value: string) => void;
  onDeadline: (value: string) => void;
  /** Dates Plan Check found in the plan text. Shown when the box is empty. */
  fromPlan?: PlanDates;
}

function usPlanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function DateField({
  id,
  label,
  note,
  value,
  onChange,
  found,
}: {
  id: string;
  label: string;
  note?: string;
  value: string;
  onChange: (v: string) => void;
  found?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-rule py-3 sm:grid-cols-[1fr_11rem] sm:items-end">
      <label htmlFor={id} className="leading-snug">
        <span className="font-bold">{label}</span>
        {note ? <span className="block text-sm text-pencil">{note}</span> : null}
        {found && (!value || value === found) ? (
          <span className="mt-1 block text-sm font-bold">Filled in from your plan: {usPlanDate(found)}</span>
        ) : null}
        {found && value && value !== found ? (
          <span className="mt-1 block text-sm font-bold text-red-pen">Your plan says {usPlanDate(found)}. These should match.</span>
        ) : null}
      </label>
      <input id={id} type="date" className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function DatesPanel({ profile, dates, deadline, onDate, onDeadline, fromPlan }: Props) {
  return (
    <section aria-labelledby="dates-title">
      <h2 id="dates-title" className="font-display text-2xl font-bold">
        Your dates
      </h2>
      <p className="mt-2 max-w-prose text-pencil">
        Forms must be signed before you start. Add the date on each signed form, and leave a form blank if it is not signed yet. If your plan already states the start or end date, Plan Check reads it from there.
      </p>

      <div className="mt-4">
        <DateField
          id="d-start"
          label="Planned start of experimentation"
          note="The start date on Form 1A. Everything is checked against it."
          value={dates.start ?? ""}
          onChange={(v) => onDate("start", v)}
          found={fromPlan?.start?.iso}
        />
        <DateField
          id="d-end"
          label="Planned end of experimentation"
          value={dates.end ?? ""}
          onChange={(v) => onDate("end", v)}
          found={fromPlan?.end?.iso}
        />
        <DateField
          id="d-deadline"
          label="Your fair's pre-approval deadline"
          note="Optional. Fairs set their own, so check yours."
          value={deadline}
          onChange={onDeadline}
          found={fromPlan?.deadline?.iso}
        />
      </div>

      <h3 className="mt-8 font-display text-xl font-bold">Signed before you start</h3>
      <div className="mt-2">
        {BEFORE.filter((r) => r.show(profile)).map((r) => (
          <DateField
            key={r.key}
            id={`d-${r.key}`}
            label={r.label}
            note={r.note}
            value={dates[r.key] ?? ""}
            onChange={(v) => onDate(r.key, v)}
          />
        ))}
      </div>

      <details className="mt-6 border-t border-rule pt-3">
        <summary className="cursor-pointer font-display text-xl font-bold">Completed after you finish</summary>
        <div className="mt-2">
          {AFTER.filter((r) => r.show(profile)).map((r) => (
            <DateField
              key={r.key}
              id={`d-${r.key}`}
              label={r.label}
              note={r.note}
              value={dates[r.key] ?? ""}
              onChange={(v) => onDate(r.key, v)}
            />
          ))}
        </div>
      </details>
    </section>
  );
}
