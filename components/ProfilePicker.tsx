"use client";

import type { Detections, Profile } from "@/lib/engine/types";

interface Item {
  key: keyof Profile;
  label: string;
  hint: string;
  detect?: keyof Detections;
}

const ITEMS: Item[] = [
  { key: "humans", label: "People take part", hint: "Surveys, interviews, tests on people", detect: "humans" },
  { key: "vertebrates", label: "Live vertebrate animals", hint: "Mice, fish, birds, pets", detect: "vertebrates" },
  { key: "phba", label: "Bacteria, mold, tissue or blood", hint: "Microorganisms, rDNA, body fluids", detect: "phba" },
  { key: "hazards", label: "Hazardous chemicals or devices", hint: "Acids, flames, lasers, high voltage", detect: "hazards" },
  { key: "outsideSite", label: "Work at an outside lab", hint: "University, hospital, company", detect: "outsideSite" },
  { key: "continuation", label: "Builds on earlier work", hint: "A continuation of a past project", detect: "continuation" },
  { key: "team", label: "Team project", hint: "More than one student", detect: "team" },
  { key: "usesAI", label: "I used an AI tool", hint: "For any part of the project", detect: "aiUsed" },
];

interface Props {
  profile: Profile;
  detected: Detections;
  onChange: (key: keyof Profile, value: boolean) => void;
}

/** The words Plan Check matched, so the student can judge whether a tick is right. */
function foundTerms(detected: Detections, key?: keyof Detections): string[] {
  if (!key) return [];
  const seen = new Set<string>();
  for (const h of detected[key]) {
    const t = h.term.trim().toLowerCase();
    if (t) seen.add(t);
    if (seen.size === 3) break;
  }
  return [...seen];
}

export function ProfilePicker({ profile, detected, onChange }: Props) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="font-display text-2xl font-bold">What your project involves</legend>
      <p className="mt-2 max-w-prose text-pencil">
        Plan Check ticked what it found in your plan. Change anything it got wrong. Each tick adds the forms and checks that go with it.
      </p>
      <ul className="mt-4 grid list-none gap-x-8 p-0 md:grid-cols-2">
        {ITEMS.map((it) => {
          const terms = foundTerms(detected, it.detect);
          return (
            <li key={it.key} className="border-t border-rule">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--ink)]"
                  checked={profile[it.key]}
                  onChange={(e) => onChange(it.key, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{it.label}</span>
                  <span className="block text-sm leading-snug text-pencil">{it.hint}</span>
                  {terms.length > 0 ? (
                    <span className="mt-1 block text-sm leading-snug">
                      <span className="font-bold">Found in your plan:</span> {terms.map((t) => `“${t}”`).join(", ")}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
