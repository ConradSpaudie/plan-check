import { emptyProfile, suggestProfile } from "./engine/detect";
import type { Detections, Finding, FormDates, Profile } from "./engine/types";

/**
 * Everything the student has entered. The report is always derived from this, live,
 * so there is one update model: change anything and the report follows.
 */
export interface AppState {
  plan: string;
  /** Ticks the student changed by hand. Everything else follows what Plan Check finds in the plan. */
  overrides: Partial<Profile>;
  dates: FormDates;
  deadline: string;
  /** Findings the student marked "Doesn't apply", by findingKey. */
  dismissed: string[];
  step: Step;
  /** Where the plan came from. A sample's dates are not carried into the student's own plan. */
  source: "own" | "sample";
}

export type Step = 1 | 2 | 3;

export const initialState: AppState = {
  plan: "",
  overrides: {},
  dates: {},
  deadline: "",
  dismissed: [],
  step: 1,
  source: "own",
};

export type Action =
  | { type: "restore"; state: AppState }
  | { type: "setPlan"; plan: string }
  /** A new plan from a file: keeps the student's dates and ticks unless the last plan was a sample. */
  | { type: "loadPlan"; plan: string }
  | { type: "loadSample"; plan: string; profile: Profile; dates: FormDates; deadline?: string }
  | { type: "setTick"; key: keyof Profile; value: boolean }
  | { type: "setDate"; key: keyof FormDates; value: string }
  | { type: "setDeadline"; value: string }
  | { type: "dismiss"; key: string }
  | { type: "restoreFinding"; key: string }
  | { type: "goto"; step: Step }
  | { type: "clear" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "setPlan":
      return { ...state, plan: action.plan, step: action.plan.trim() ? state.step : 1 };
    case "loadPlan": {
      const fresh = state.source === "sample";
      return {
        ...state,
        plan: action.plan,
        overrides: fresh ? {} : state.overrides,
        dates: fresh ? {} : state.dates,
        deadline: fresh ? "" : state.deadline,
        dismissed: [],
        step: 2,
        source: "own",
      };
    }
    case "loadSample": {
      // A sample's ticks are stored as overrides only where they differ from an empty profile.
      const overrides: Partial<Profile> = {};
      for (const k of Object.keys(action.profile) as (keyof Profile)[]) {
        if (action.profile[k]) overrides[k] = true;
      }
      return {
        plan: action.plan,
        overrides,
        dates: { ...action.dates },
        deadline: action.deadline ?? "",
        dismissed: [],
        step: 3,
        source: "sample",
      };
    }
    case "setTick":
      return { ...state, overrides: { ...state.overrides, [action.key]: action.value } };
    case "setDate": {
      const dates = { ...state.dates };
      if (action.value) dates[action.key] = action.value;
      else delete dates[action.key];
      return { ...state, dates };
    }
    case "setDeadline":
      return { ...state, deadline: action.value };
    case "dismiss":
      return state.dismissed.includes(action.key) ? state : { ...state, dismissed: [...state.dismissed, action.key] };
    case "restoreFinding":
      return { ...state, dismissed: state.dismissed.filter((k) => k !== action.key) };
    case "goto":
      return { ...state, step: state.plan.trim() ? action.step : 1 };
    case "clear":
      return initialState;
  }
}

/** The ticks: what the plan mentions, with the student's own changes on top. */
export function profileOf(detected: Detections, overrides: Partial<Profile>): Profile {
  const suggested = suggestProfile(detected);
  const out = { ...emptyProfile };
  for (const k of Object.keys(out) as (keyof Profile)[]) {
    out[k] = overrides[k] ?? suggested[k] ?? false;
  }
  return out;
}

/** Stable id for a finding, so "Doesn't apply" survives edits that reorder the list. */
export function findingKey(f: Pick<Finding, "id" | "title">): string {
  return `${f.id}|${f.title}`;
}

export const STORAGE_KEY = "plancheck:v1";

const PROFILE_KEYS = Object.keys(emptyProfile) as (keyof Profile)[];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Read saved state defensively: storage is user-controlled and may hold anything. */
export function parseSaved(raw: string | null): AppState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.plan !== "string" || !d.plan.trim()) return null;

  const overrides: Partial<Profile> = {};
  if (d.overrides && typeof d.overrides === "object") {
    for (const k of PROFILE_KEYS) {
      const v = (d.overrides as Record<string, unknown>)[k];
      if (typeof v === "boolean") overrides[k] = v;
    }
  }
  const dates: FormDates = {};
  if (d.dates && typeof d.dates === "object") {
    for (const [k, v] of Object.entries(d.dates as Record<string, unknown>)) {
      if (typeof v === "string" && ISO.test(v)) dates[k as keyof FormDates] = v;
    }
  }
  const step = d.step === 2 || d.step === 3 ? d.step : 1;
  return {
    plan: d.plan.slice(0, 200_000),
    overrides,
    dates,
    deadline: typeof d.deadline === "string" && ISO.test(d.deadline) ? d.deadline : "",
    dismissed: Array.isArray(d.dismissed) ? d.dismissed.filter((x): x is string => typeof x === "string").slice(0, 200) : [],
    step,
    source: d.source === "sample" ? "sample" : "own",
  };
}

export function hasData(s: AppState): boolean {
  return !!s.plan.trim() || Object.keys(s.dates).length > 0 || !!s.deadline;
}
