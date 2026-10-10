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
  onToggle: (key: keyof Profile) => void;
}

export function ProfilePicker({ profile, detected, onToggle }: Props) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="font-display text-2xl font-bold">What your project involves</legend>
      <p className="mt-2 max-w-prose text-pencil">
        Plan Check ticks what it finds in your plan. Change anything it got wrong. Each tick adds the forms and checks that go with it.
      </p>
      <ul className="mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
        {ITEMS.map((it) => {
          const on = profile[it.key];
          const found = it.detect ? detected[it.detect].length > 0 : false;
          return (
            <li key={it.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(it.key)}
                className={`flex w-full items-start gap-3 border-2 px-3 py-2.5 text-left transition-colors ${
                  on ? "border-ink bg-ink text-sheet" : "border-ink bg-sheet text-ink hover:bg-paper"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1 grid h-5 w-5 shrink-0 place-items-center border-2 text-sm font-bold leading-none ${
                    on ? "border-sheet" : "border-ink"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span>
                  <span className="block font-bold leading-snug">{it.label}</span>
                  <span className={`block text-sm leading-snug ${on ? "opacity-80" : "text-pencil"}`}>
                    {it.hint}
                  </span>
                  {found ? <span className="block text-sm font-bold leading-snug">Found in your plan</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
