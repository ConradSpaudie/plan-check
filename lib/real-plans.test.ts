import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { annotate } from "./annotate";
import { detectFromPlan, emptyProfile, runChecks, suggestProfile } from "./engine";

// Real, publicly posted sample plans (see fixtures/real/SOURCES.md). Used to catch false positives.
const dir = join(__dirname, "..", "fixtures", "real");
const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));

describe("real sample plans", () => {
  it("has fixtures", () => expect(files.length).toBeGreaterThanOrEqual(5));

  for (const f of files) {
    it(`${f}: runs, and marks never change the text`, () => {
      const plan = readFileSync(join(dir, f), "utf8");
      const profile = { ...emptyProfile, ...suggestProfile(detectFromPlan(plan)) };
      const r = runChecks({ plan, profile, dates: {}, today: "2026-10-10" });
      expect(r.wordCount).toBeGreaterThan(100);
      expect(annotate(plan, r.findings).map((s) => s.text).join("")).toBe(plan);
      for (const x of r.findings) for (const e of x.evidence ?? []) expect(e.length).toBeGreaterThan(0);
    });
  }

  it("finds the sections the West Georgia sample actually has", () => {
    const r = runChecks({ plan: readFileSync(join(dir, "westga-biochar-sample.txt"), "utf8"), profile: emptyProfile, dates: {}, today: "2026-10-10" });
    const has = (id: string) => r.sections.find((s) => s.id === id)!.hasHeading;
    expect(has("procedure")).toBe(true);
    expect(has("analysis")).toBe(true);
    expect(has("question")).toBe(true);
    expect(has("bibliography")).toBe(true);
  });
});
