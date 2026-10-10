import { describe, expect, it } from "vitest";
import { STRONG_SAMPLE, WEAK_SAMPLE } from "../samples";
import { checkDates, plusYear } from "./dates";
import { detect, detectFromPlan, emptyProfile, runChecks, suggestProfile } from "./index";
import { bibEntries } from "./plan";
import { parsePlan } from "./sections";
import type { FormDates, Profile } from "./types";

const TODAY = "2026-10-10";

function ids(report: ReturnType<typeof runChecks>, severity?: string) {
  return report.findings.filter((f) => !severity || f.severity === severity).map((f) => f.id);
}

describe("dates", () => {
  const profile: Profile = { ...emptyProfile, humans: true };
  const run = (dates: FormDates, p: Profile = profile, deadline?: string) =>
    checkDates({ plan: "", profile: p, dates, today: TODAY, deadline });

  it("flags forms dated on or after the start date as fixes", () => {
    const { findings } = run({ start: "2026-11-02", f1: "2026-11-02", f1B_student: "2026-11-05", f1B_parent: "2026-10-30" });
    const fixes = findings.filter((f) => f.severity === "fix" && f.id === "B3");
    expect(fixes.map((f) => f.title).join(" | ")).toContain("Form 1 (Adult Sponsor checklist)");
    expect(fixes.map((f) => f.title).join(" | ")).toContain("student signature");
    expect(fixes.some((f) => f.title.includes("parent"))).toBe(false);
  });

  it("passes when every entered form is before the start date", () => {
    const { findings, passes } = run(
      { start: "2026-11-02", f1: "2026-10-20", f1B_student: "2026-10-21", f1B_parent: "2026-10-21", f1B_approval: "2026-10-25", f4: "2026-10-24" },
    );
    expect(findings.filter((f) => f.severity === "fix")).toHaveLength(0);
    expect(passes.some((p) => p.id === "B3")).toBe(true);
  });

  it("asks for missing dates only for forms the project needs", () => {
    const { findings } = run({ start: "2026-11-02" }, { ...emptyProfile });
    const text = findings.map((f) => f.title).join(" | ");
    expect(text).toContain("Form 1 (Adult Sponsor checklist) has no date");
    expect(text).not.toContain("Form 4");
    const humans = run({ start: "2026-11-02" }, { ...emptyProfile, humans: true });
    expect(humans.findings.map((f) => f.title).join(" | ")).toContain("Form 4");
  });

  it("warns when the start date has passed but required forms are undated", () => {
    const { findings } = run({ start: "2026-10-01" });
    const b6 = findings.find((f) => f.id === "B6");
    expect(b6?.severity).toBe("fix");
    expect(b6?.askYourself).toContain("src@societyforscience.org");
  });

  it("never suggests changing a date to fit", () => {
    const { findings } = run({ start: "2026-11-02", f1: "2026-11-09" });
    const text = JSON.stringify(findings);
    expect(text).toContain("Do not change a date to make it fit");
  });

  it("checks that after-forms are not dated before the end date", () => {
    const { findings } = run(
      { start: "2026-11-02", end: "2026-12-01", f2C: "2026-11-15" },
      { ...emptyProfile, outsideSite: true },
    );
    expect(findings.some((f) => f.id === "B4")).toBe(true);
  });

  it("flags end before start and spans over 12 months", () => {
    expect(run({ start: "2026-11-02", end: "2026-10-01" }).findings.some((f) => f.id === "B2" && f.severity === "fix")).toBe(true);
    expect(run({ start: "2026-02-01", end: "2027-03-01" }).findings.some((f) => f.id === "B8" && f.title.includes("more than 12 months"))).toBe(true);
    expect(run({ start: "2026-02-01", end: "2027-02-01" }).findings.some((f) => f.title.includes("more than 12 months"))).toBe(false);
  });

  it("flags a passed fair deadline and late approval", () => {
    const { findings } = run({ start: "2026-11-02", f1B_approval: "2026-11-01" }, profile, "2026-10-01");
    expect(findings.some((f) => f.id === "B9" && f.severity === "fix" && f.title.includes("has passed"))).toBe(true);
    expect(findings.some((f) => f.id === "B9" && f.title.includes("after your fair's deadline"))).toBe(true);
  });

  it("plusYear handles leap days", () => {
    expect(plusYear("2027-10-10")).toBe("2028-10-10");
    expect(plusYear("2028-02-29")).toBe("2029-02-28");
  });
});

describe("sections", () => {
  it("finds headings in several styles", () => {
    const parsed = parsePlan(`# Rationale\nText here.\n\n**Procedure:** First do this.\nThen that.\n\n3. Risk and Safety\nWear goggles.\nData Analysis:\nA t-test.\nReferences\n[1] Foo 2020.`);
    const have = parsed.info.filter((i) => i.hasHeading).map((i) => i.id);
    expect(have).toEqual(expect.arrayContaining(["rationale", "procedure", "safety", "analysis", "bibliography"]));
    expect(parsed.sections.procedure).toContain("First do this.");
    expect(parsed.sections.safety).toContain("goggles");
  });

  it("does not treat body sentences as headings", () => {
    const parsed = parsePlan("Rationale\nThe purpose of this project is to test things carefully and with care.\nProcedure\nStep one.");
    expect(parsed.sections.rationale).toContain("The purpose of this project");
  });
});

describe("heading and detection edge cases", () => {
  it("handles compound headings", () => {
    const parsed = parsePlan("Research Question and Hypothesis\nDoes X change Y? I predict yes.\n\nMaterials and Methods\nMix 5 mL of A.");
    const have = parsed.info.filter((i) => i.hasHeading).map((i) => i.id);
    expect(have).toEqual(expect.arrayContaining(["question", "materials", "procedure"]));
    expect(parsed.sections.question).toContain("I predict yes");
  });
  it("ignores negated hazards and literature about earlier work", () => {
    const d = detect("No high voltage is exposed. Earlier work found that light matters. Previous research showed growth.");
    expect(d.hazards).toHaveLength(0);
    expect(d.continuation).toHaveLength(0);
  });
  it("still detects real continuations and real hazards", () => {
    const d = detect("This continues my last year's project. I will use high voltage equipment.");
    expect(d.continuation.length).toBeGreaterThan(0);
    expect(d.hazards.length).toBeGreaterThan(0);
  });
  it("does not treat compost bins as biological agents", () => {
    expect(detect("Used soil goes in the school compost bin.").phba).toHaveLength(0);
    expect(detect("I will culture compost samples on agar.").phba.length).toBeGreaterThan(0);
  });
});

describe("bibliography entry parsing", () => {
  it("splits numbered entries and joins wrapped lines", () => {
    const e = bibEntries("[1] Smith, J. (2019). A title.\n   Journal of Things, 3(2).\n[2] Lee (2020). Another.");
    expect(e).toHaveLength(2);
    expect(e[0]).toContain("Journal of Things");
  });
  it("counts one entry per line when unnumbered", () => {
    const e = bibEntries("https://a.com/x\nhttps://b.com/y\nhttps://c.com/z");
    expect(e).toHaveLength(3);
  });
  it("attaches a URL on the next line to a full entry", () => {
    const e = bibEntries("Smith, J. (2019). Caffeine and reaction time in teens. Journal of Things.\nhttps://doi.org/10.1/abc");
    expect(e).toHaveLength(1);
  });
});

describe("detection", () => {
  it("detects humans, animals, biological agents and hazards", () => {
    const d = detect(
      "I will survey 40 students. I will test mice. I will grow bacteria on agar plates. I will use bleach and a Bunsen burner.",
    );
    const s = suggestProfile(d);
    expect(s).toMatchObject({ humans: true, vertebrates: true, phba: true, hazards: true });
  });
  it("does not trigger on innocent words", () => {
    const d = detect("The category of cats is large. We study the subject of lead pencils and acid-free paper categories.");
    expect(d.humans).toHaveLength(0);
    expect(d.phba).toHaveLength(0);
    // "cats" is a vertebrate word, "acid-free" is not a hazard on its own, accepted noise: heuristic only warns.
    expect(d.hazards.length).toBeLessThanOrEqual(1);
  });
  it("detects outside labs without matching inside other words", () => {
    expect(detect("I will work in a lab at the university.").outsideSite.length).toBeGreaterThan(0);
    expect(detect("A flucuating music subject.").outsideSite).toHaveLength(0);
  });
});

describe("weak sample", () => {
  const report = runChecks({ plan: WEAK_SAMPLE.plan, profile: WEAK_SAMPLE.profile, dates: WEAK_SAMPLE.dates, deadline: WEAK_SAMPLE.deadline, today: TODAY });

  it("catches the planted problems", () => {
    const all = report.findings.map((f) => f.id + ":" + f.severity);
    expect(all).toContain("A1:warn"); // old form numbers
    expect(all).toContain("A5:warn"); // humans detected, not ticked
    expect(all).toContain("C8:fix"); // N/A safety
    expect(all).toContain("D5:warn"); // vague wording
    expect(all).toContain("D8:fix"); // bare URLs
    expect(all).toContain("B3:fix"); // dates after start
  });

  it("shows evidence from the student's own words and never rewrites", () => {
    const vague = report.findings.find((f) => f.id === "D5");
    expect(vague?.evidence?.join(" ")).toMatch(/Standard procedure|as needed|few weeks|Several/);
    for (const f of report.findings) {
      expect(f.title).not.toMatch(/\bwrite\b|\brewrite\b|\breplace with\b/i);
    }
  });

  it("every finding has a rule, a reason and at least one source link", () => {
    for (const f of report.findings) {
      expect(f.why.length).toBeGreaterThan(10);
      expect(f.sources.length).toBeGreaterThan(0);
      for (const s of f.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("puts date and approval problems in fix-first", () => {
    expect(report.fixFirst.length).toBeGreaterThan(0);
    expect(report.fixFirst.every((f) => f.severity !== "verify")).toBe(true);
    expect(report.fixFirst[0].group === "dates" || report.fixFirst[0].group === "forms").toBe(true);
  });
});

describe("weak sample with the humans box ticked", () => {
  const report = runChecks({
    plan: WEAK_SAMPLE.plan,
    profile: { ...WEAK_SAMPLE.profile, humans: true },
    dates: WEAK_SAMPLE.dates,
    today: TODAY,
  });
  it("asks for IRB detail and Form 4", () => {
    expect(ids(report)).toContain("E1");
    expect(report.formsNeeded.some((f) => f.id === "4")).toBe(true);
    expect(report.findings.some((f) => f.id === "B3" && f.title.includes("Form 4"))).toBe(true);
  });
});

describe("strong sample", () => {
  const report = runChecks({ plan: STRONG_SAMPLE.plan, profile: STRONG_SAMPLE.profile, dates: STRONG_SAMPLE.dates, deadline: STRONG_SAMPLE.deadline, today: TODAY });

  it("has no fixes", () => {
    const fixes = report.findings.filter((f) => f.severity === "fix");
    expect(fixes.map((f) => `${f.id}: ${f.title}`)).toEqual([]);
  });

  it("has very few warnings", () => {
    const warns = report.findings.filter((f) => f.severity === "warn");
    expect(warns.map((f) => `${f.id}: ${f.title}`)).toEqual([]);
  });

  it("recognises all seven core sections", () => {
    const missing = report.sections.filter((s) => !["ack"].includes(s.id) && !s.hasHeading).map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe("routing and forms", () => {
  it("maps old form numbers to 2026-27", () => {
    const r = runChecks({ plan: "Procedure\nMy mentor will sign Form 1C when work is done.", profile: emptyProfile, dates: {}, today: TODAY });
    const a1 = r.findings.find((f) => f.id === "A1");
    expect(a1?.detail).toContain("Form 2C");
  });
  it("includes the new 2A for every project", () => {
    const r = runChecks({ plan: "", profile: emptyProfile, dates: {}, today: TODAY });
    expect(r.formsNeeded.map((f) => f.id)).toEqual(expect.arrayContaining(["1", "1A", "1B", "2A"]));
  });
  it("adds Form 3 for hazards and 2C for outside sites", () => {
    const r = runChecks({ plan: "", profile: { ...emptyProfile, hazards: true, outsideSite: true }, dates: {}, today: TODAY });
    expect(r.formsNeeded.map((f) => f.id)).toEqual(expect.arrayContaining(["3", "2C"]));
  });
  it("returns an empty report for empty input without throwing", () => {
    const r = runChecks({ plan: "", profile: emptyProfile, dates: {}, today: TODAY });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.wordCount).toBe(0);
  });
});

describe("lessons from real public sample plans", () => {
  it("reads a long inline heading like 'Risk and Safety: No potential risks...'", () => {
    const p = parsePlan(
      "Procedure:\n1. Do the thing.\nRisk and Safety: No potential risks exist for this project because the student will not come in contact with any patients and will not receive any names or other information.",
    );
    expect(p.info.find((i) => i.id === "safety")!.hasHeading).toBe(true);
  });

  it("splits 'Procedures, Calculations and Data Analysis'", () => {
    const p = parsePlan("Procedures, Calculations and Data Analysis\nWeigh 1 g of salt.");
    expect(p.info.find((i) => i.id === "procedure")!.hasHeading).toBe(true);
    expect(p.info.find((i) => i.id === "analysis")!.hasHeading).toBe(true);
  });

  it("treats ISEF addendum headings as risk sections", () => {
    const p = parsePlan("Bibliography:\nA. (2020). Title.\nPotentially hazardous biological agents research:\nBSL-1 only.");
    expect(p.info.find((i) => i.id === "safety")!.hasHeading).toBe(true);
  });

  it("accepts an 'Expected Outcomes' heading or an if-then hypothesis", () => {
    const a = runChecks({ plan: "Expected Outcomes:\nTrauma patients clot faster.", profile: emptyProfile, dates: {}, today: TODAY });
    const b = runChecks({ plan: "Research Question: Does X affect Y?\nHypothesis: If more X is added, then Y will rise.", profile: emptyProfile, dates: {}, today: TODAY });
    for (const r of [a, b]) expect(r.findings.some((f) => f.title === "No hypothesis or expected outcome found")).toBe(false);
  });

  it("does not demand a separate Materials heading", () => {
    const r = runChecks({ plan: "Procedure:\nDo it.", profile: emptyProfile, dates: {}, today: TODAY });
    const m = r.findings.find((f) => f.title === "No materials list found");
    expect(m?.severity).toBe("warn");
  });

  it("joins a short MLA continuation line to its entry and does not call it a link", () => {
    const e = bibEntries('"Home Fires." Ready. Federal Emergency Management Agency, 26 Sept 2012. Web. 10\nFeb 2013.\nMadrzykowski, Dan. "Fire Behavior." NIST, 15 Oct 2010.');
    expect(e).toHaveLength(2);
  });

  it("does not tick biological agents for a passing mention of human tissue", () => {
    expect(suggestProfile(detect("Fire can damage human tissue in seconds.")).phba).toBe(false);
  });
});

describe("lessons from a real human-participants plan", () => {
  it("reads '8) BIBLIOGRAPHY (SEPARATE PIECE OF PAPER)' and a VARIABLES heading", () => {
    const p = parsePlan("3) VARIABLES\nIndependent variable: the tutor.\n8)  BIBLIOGRAPHY(SEPARATE PIECE OF PAPER)\nBloom, B. S. (1984). The 2 sigma problem.");
    expect(p.info.find((i) => i.id === "procedure")!.hasHeading).toBe(true);
    expect(p.info.find((i) => i.id === "bibliography")!.hasHeading).toBe(true);
  });

  it("keeps an addendum after the bibliography in the body", () => {
    const p = parsePlan("Procedure\nDo it.\nBibliography\nA. (2020). T.\nHuman Participants Addendum\nBenefits: free tutoring.");
    expect(p.body).toContain("Benefits");
    expect(p.body).not.toContain("A. (2020)");
  });

  it("does not treat a cited university or a dataset supplier as an outside lab", () => {
    const plan = "Rationale\nIn 2025, University of Delaware's Center ran a trial.\nProcedure\nWe use DIBELS 8 (University of Oregon, free download) in a quiet room at the school.";
    expect(suggestProfile(detectFromPlan(plan)).outsideSite).toBe(false);
    expect(suggestProfile(detectFromPlan("Procedure\nI will run the samples at the university lab.")).outsideSite).toBe(true);
  });

  it("does not read 'how far our results generalize' or 'no reading advice will be given' as problems", () => {
    const r = runChecks({
      plan: "Procedure\nThis limits how far our results generalize. No individual results or reading advice will be given to parents. Children with a diagnosed speech impairment are not eligible.",
      profile: { ...emptyProfile, humans: true },
      dates: {},
      today: TODAY,
    });
    expect(r.findings.some((f) => f.id === "D6" || f.id === "E3")).toBe(false);
  });

  it("counts 'built with AI coding assistance' as an AI-use statement", () => {
    const r = runChecks({ plan: "Procedure\nThe tutor was built with AI coding assistance.", profile: { ...emptyProfile, usesAI: true }, dates: {}, today: TODAY });
    expect(r.findings.some((f) => f.id === "D2")).toBe(false);
  });
});

describe("consistency checks", () => {
  const run = (plan: string, profile = emptyProfile) => runChecks({ plan, profile, dates: {}, today: TODAY });

  it("flags references to steps that are not numbered", () => {
    const r = run("Procedure\n1. Set up.\n2. Probe.\nSteps 4-6 repeat for each child. See step 9.");
    const f = r.findings.find((x) => x.id === "D9" && /steps? 4-6, 9/.test(x.title));
    expect(f).toBeTruthy();
  });

  it("does not flag step references that exist", () => {
    const r = run("Procedure\n1. Set up.\n2. Probe.\n3. Repeat steps 1-2.");
    expect(r.findings.some((x) => x.id === "D9" && /refers to/.test(x.title))).toBe(false);
  });

  it("flags a stated reference count that does not match", () => {
    const r = run("Procedure\nSee the 3 references below.\nBibliography\nA, B. (2020). One.\nC, D. (2021). Two.");
    expect(r.findings.some((x) => x.title === "The plan says 3 references, but the bibliography has 2")).toBe(true);
  });

  it("flags a form the profile does not need", () => {
    const r = run("Procedure\nMy grandmother is the designated supervisor on Form 3.", { ...emptyProfile, humans: true });
    expect(r.findings.some((x) => x.id === "A6" && x.title.includes("Form 3"))).toBe(true);
  });

  it("flags sessions longer than their time slots", () => {
    const r = run("Procedure\nChildren arrive in a staggered 30 minute slot.\nEach session is 15 to 40 minutes.");
    expect(r.findings.some((x) => x.title === "Sessions can run 40 minutes, but the time slots are 30 minutes")).toBe(true);
  });

  it("detects a two-author byline and AI coding assistance", () => {
    const d = detectFromPlan("My Project Title\nConrad Spaudie, Michael Brandt, Sep 24 2026\nProcedure\nThe app was built with AI coding assistance.");
    expect(suggestProfile(d).team).toBe(true);
    expect(suggestProfile(d).usesAI).toBe(true);
  });
});
