import { describe, expect, it } from "vitest";
import { annotate, locate } from "./annotate";
import { runChecks } from "./engine";
import { WEAK_SAMPLE } from "./samples";

describe("annotate", () => {
  it("locates evidence across whitespace differences and trailing ellipses", () => {
    const plan = "First line.\nStandard   procedure will be\nused for the test. Last.";
    const r = locate(plan, "Standard procedure will be used for the test…");
    expect(r).not.toBeNull();
    expect(plan.slice(r![0], r![1])).toContain("used for the test");
  });

  it("returns segments that rebuild the plan exactly", () => {
    const report = runChecks({ plan: WEAK_SAMPLE.plan, profile: WEAK_SAMPLE.profile, dates: WEAK_SAMPLE.dates, today: "2026-10-10" });
    const segs = annotate(WEAK_SAMPLE.plan, report.findings);
    expect(segs.map((s) => s.text).join("")).toBe(WEAK_SAMPLE.plan);
    expect(segs.some((s) => s.finding !== undefined)).toBe(true);
  });

  it("never overlaps marks and prefers the more serious finding", () => {
    const plan = "The test is repeated as needed for the whole study duration.";
    const findings = [
      { id: "X", group: "procedure", severity: "verify", kind: "heuristic", title: "t", detail: "d", why: "w", sources: [], evidence: ["The test is repeated as needed for the whole study duration."] },
      { id: "Y", group: "procedure", severity: "fix", kind: "heuristic", title: "t", detail: "d", why: "w", sources: [], evidence: ["repeated as needed for the whole"] },
    ] as Parameters<typeof annotate>[1];
    const segs = annotate(plan, findings);
    const marked = segs.filter((s) => s.finding !== undefined);
    expect(marked).toHaveLength(1);
    expect(marked[0].severity).toBe("fix");
    expect(segs.map((s) => s.text).join("")).toBe(plan);
  });
});
