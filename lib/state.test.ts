import { describe, expect, it } from "vitest";
import { detect } from "./engine/detect";
import { emptyProfile } from "./engine/detect";
import { findingKey, initialState, parseSaved, profileOf, reducer } from "./state";

describe("app state", () => {
  it("follows the plan for ticks until the student changes one", () => {
    const d = detect("Twenty students from my school will be recruited as participants and take a survey.");
    expect(profileOf(d, {}).humans).toBe(true);
    expect(profileOf(d, { humans: false }).humans).toBe(false);
    expect(profileOf(d, { hazards: true }).hazards).toBe(true);
  });

  it("does not carry a sample's dates into the student's own plan", () => {
    let s = reducer(initialState, {
      type: "loadSample",
      plan: "Sample plan text",
      profile: { ...emptyProfile },
      dates: { start: "2026-11-02" },
      deadline: "2026-10-30",
    });
    expect(s.step).toBe(3);
    s = reducer(s, { type: "loadPlan", plan: "My own plan" });
    expect(s.dates).toEqual({});
    expect(s.deadline).toBe("");
    expect(s.step).toBe(2);
  });

  it("keeps the student's dates when they upload a revised plan", () => {
    let s = reducer(initialState, { type: "loadPlan", plan: "Draft one" });
    s = reducer(s, { type: "setDate", key: "f1", value: "2026-10-20" });
    s = reducer(s, { type: "loadPlan", plan: "Draft two" });
    expect(s.dates.f1).toBe("2026-10-20");
  });

  it("removes a date when the box is cleared", () => {
    let s = reducer(initialState, { type: "setDate", key: "f1", value: "2026-10-20" });
    s = reducer(s, { type: "setDate", key: "f1", value: "" });
    expect("f1" in s.dates).toBe(false);
  });

  it("dismisses and restores a finding once", () => {
    const key = findingKey({ id: "D3", title: "Vague words" });
    let s = reducer(initialState, { type: "dismiss", key });
    s = reducer(s, { type: "dismiss", key });
    expect(s.dismissed).toEqual([key]);
    s = reducer(s, { type: "restoreFinding", key });
    expect(s.dismissed).toEqual([]);
  });

  it("cannot leave step 1 without a plan", () => {
    expect(reducer(initialState, { type: "goto", step: 3 }).step).toBe(1);
    const s = reducer({ ...initialState, plan: "text", step: 3 }, { type: "setPlan", plan: "  " });
    expect(s.step).toBe(1);
  });

  it("reads saved state defensively", () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved("not json")).toBeNull();
    expect(parseSaved(JSON.stringify({ plan: "" }))).toBeNull();
    const s = parseSaved(
      JSON.stringify({
        plan: "My plan",
        overrides: { humans: true, bogus: true, team: "yes" },
        dates: { start: "2026-11-02", f1: "not a date" },
        deadline: "soon",
        dismissed: ["A|b", 4],
        step: 7,
        source: "sample",
      }),
    );
    expect(s).toEqual({
      plan: "My plan",
      overrides: { humans: true },
      dates: { start: "2026-11-02" },
      deadline: "",
      dismissed: ["A|b"],
      step: 1,
      source: "sample",
    });
  });
});
