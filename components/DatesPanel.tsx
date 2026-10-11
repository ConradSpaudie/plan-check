"use client";

import type { FormDates, PlanDates, Profile } from "@/lib/engine/types";

interface Row {
  key: keyof FormDates;
  label: string;
  note?: string;
  /** Shown for this project. */
  show: (p: Profile) => boolean;
  /** Needed for this project; otherwise optional. Matches the engine's date checks. */
  needed: (p: Profile) => boolean;
}

const BEFORE: Row[] = [
  { key: "f1", label: "Form 1, adult sponsor checklist", show: () => true, needed: () => true },
  { key: "f1B_student", label: "Form 1B, student signature", show: () => true, needed: () => true },
  { key: "f1B_parent", label: "Form 1B, parent or guardian signature", show: () => true, needed: () => true },
  {
    key: "f1B_approval",
    label: "Form 1B, SRC or IRB prior approval",
    show: (p) => p.humans || p.vertebrates || p.phba,
    needed: () => true,
  },
  { key: "f4", label: "Form 4, human participants", note: "All three IRB members", show: (p) => p.humans, needed: () => true },
  { key: "f5A", label: "Form 5A, vertebrate animals", show: (p) => p.vertebrates && !p.outsideSite, needed: () => true },
  { key: "f6A", label: "Form 6A, biological agents", show: (p) => p.phba, needed: () => true },
  { key: "f3", label: "Form 3, risk assessment", show: (p) => p.hazards || p.phba, needed: () => true },
  {
    key: "f2B",
    label: "Form 2B, Qualified Scientist",
    note: "Was Form 2. Only if you work with one.",
    show: () => true,
    needed: () => false,
  },
];

const AFTER: Row[] = [
  { key: "f2C", label: "Form 2C, outside lab", note: "Was Form 1C. Signed by the site supervisor.", show: (p) => p.outsideSite, needed: () => false },
  { key: "f5B", label: "Form 5B, animals at an institution", show: (p) => p.vertebrates && p.outsideSite, needed: () => false },
  { key: "f7", label: "Form 7, continuation", show: (p) => p.continuation, needed: () => false },
  { key: "finalSrc", label: "Final SRC review before the fair", note: "Form 1B section 3", show: () => true, needed: () => false },
];

interface Props {
  profile: Profile;
  dates: FormDates;
  deadline: string;
  onDate: (key: keyof FormDates, value: string) => void;
  onDeadline: (value: string) => void;
  /** Dates Plan Check found in the plan text. Used when the box is empty. */
  fromPlan?: PlanDates;
}

function usDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function Need({ needed }: { needed: boolean }) {
  return needed ? (
    <span className="ml-2 inline-block border border-ink px-1.5 text-xs font-bold leading-5">Needed</span>
  ) : (
    <span className="ml-2 inline-block border border-rule px-1.5 text-xs leading-5 text-pencil">Optional</span>
  );
}

function DateField({
  id,
  label,
  note,
  needed,
  value,
  onChange,
  found,
}: {
  id: string;
  label: string;
  note?: string;
  needed: boolean;
  value: string;
  onChange: (v: string) => void;
  found?: string;
}) {
  // A date written in the plan shows in the box until the student types their own.
  const shown = value || found || "";
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-rule py-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
      <label htmlFor={id} className="leading-snug">
        <span className="font-bold">{label}</span>
        <Need needed={needed} />
        {note ? <span className="block text-sm text-pencil">{note}</span> : null}
        {found && !value ? <span className="mt-1 block text-sm font-bold">Filled in from your plan</span> : null}
        {found && value && value !== found ? (
          <span className="mt-1 block text-sm font-bold text-red-pen">Your plan says {usDate(found)}. These should match.</span>
        ) : null}
      </label>
      <input id={id} type="date" className="field" value={shown} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function DatesPanel({ profile, dates, deadline, onDate, onDeadline, fromPlan }: Props) {
  const after = AFTER.filter((r) => r.show(profile));
  const afterFilled = after.filter((r) => dates[r.key]).length;
  return (
    <section aria-labelledby="dates-title">
      <h2 id="dates-title" className="font-display text-2xl font-bold">
        Your dates
      </h2>
      <p className="mt-2 max-w-prose text-pencil">
        Forms must be signed before you start. Add the date on each signed form, and leave it blank if it is not signed yet. Only the forms this project needs are listed.
      </p>

      <div className="mt-4">
        <DateField
          id="d-start"
          label="Planned start of experimentation"
          note="The start date on Form 1A. Every form date is checked against it."
          needed
          value={dates.start ?? ""}
          onChange={(v) => onDate("start", v)}
          found={fromPlan?.start?.iso}
        />
        <DateField
          id="d-end"
          label="Planned end of experimentation"
          needed
          value={dates.end ?? ""}
          onChange={(v) => onDate("end", v)}
          found={fromPlan?.end?.iso}
        />
        <DateField
          id="d-deadline"
          label="Your fair's pre-approval deadline"
          note="Fairs set their own, so check yours."
          needed={false}
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
            needed={r.needed(profile)}
            value={dates[r.key] ?? ""}
            onChange={(v) => onDate(r.key, v)}
          />
        ))}
      </div>

      <details className="mt-6 border-t border-rule" open={afterFilled > 0 ? true : undefined}>
        <summary className="flex min-h-11 cursor-pointer items-center font-display text-xl font-bold">
          Completed after you finish ({after.length})
        </summary>
        <p className="max-w-prose text-sm text-pencil">Optional for now. Add these once your experiment is done.</p>
        <div className="mt-2">
          {after.map((r) => (
            <DateField
              key={r.key}
              id={`d-${r.key}`}
              label={r.label}
              note={r.note}
              needed={false}
              value={dates[r.key] ?? ""}
              onChange={(v) => onDate(r.key, v)}
            />
          ))}
        </div>
      </details>
    </section>
  );
}
