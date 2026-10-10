import type { FormNeed, Profile, SignatureStep } from "./types";

/**
 * The 2026-27 form map. Form numbers changed this cycle:
 * old 1C is now 2C, old 2 is now 2B, and 2A (Student Support Disclosure) is new.
 * Source of truth: research report section "Form numbering and routing".
 */
export const LEGACY_FORM_MAP: Record<string, { now: string; name: string }> = {
  "1C": { now: "2C", name: "Regulated Research Institution form" },
  "2": { now: "2B", name: "Qualified Scientist form" },
};

export function formsNeeded(p: Profile): FormNeed[] {
  const out: FormNeed[] = [
    {
      id: "1",
      name: "Checklist for Adult Sponsor",
      why: "Required for every project.",
      signedBy: "Adult sponsor",
      timing: "before",
    },
    {
      id: "1A",
      name: "Student Checklist and Research Plan",
      why: "Required for every project. Holds your planned and actual start and end dates.",
      signedBy: "Student",
      timing: "before",
    },
    {
      id: "1B",
      name: "Approval Form",
      why: "Required for every project. Each team member needs their own.",
      signedBy: "Student, parent or guardian, then the SRC or IRB",
      timing: "before",
    },
    {
      id: "2A",
      name: "Student Support Disclosure",
      why: "New in 2026-27. Required for every project. Lists who helped you, and asks about generative AI use.",
      signedBy: "Student",
      timing: "either",
    },
  ];

  if (p.hazards || p.phba) {
    out.push({
      id: "3",
      name: "Risk Assessment",
      why: "Your project involves hazardous chemicals, activities, devices or biological agents.",
      signedBy: "Direct supervisor or Qualified Scientist",
      timing: "before",
    });
  }
  if (p.humans) {
    out.push({
      id: "4",
      name: "Human Participants",
      why: "Your project involves human participants. Needs IRB review before you recruit anyone.",
      signedBy: "IRB (three members) and student",
      timing: "before",
    });
  }
  if (p.vertebrates && !p.outsideSite) {
    out.push({
      id: "5A",
      name: "Vertebrate Animals (school, home or field)",
      why: "Live vertebrate animals. Needs SRC pre-approval before any work.",
      signedBy: "Student, supervisor or Qualified Scientist, SRC",
      timing: "before",
    });
  }
  if (p.vertebrates && p.outsideSite) {
    out.push({
      id: "5B",
      name: "Vertebrate Animals (regulated research institution)",
      why: "Vertebrate animal work at a regulated institution. Completed after experimentation.",
      signedBy: "Institution (IACUC) and student",
      timing: "after",
    });
  }
  if (p.phba) {
    out.push({
      id: "6A",
      name: "Potentially Hazardous Biological Agents",
      why: "Microorganisms, rDNA, tissue or body fluids. Needs SRC review before any work.",
      signedBy: "Student, supervisor, SRC",
      timing: "before",
    });
    out.push({
      id: "6B",
      name: "Human and Vertebrate Animal Tissue (with 6A)",
      why: "Needed only if you use human or vertebrate tissue or body fluids.",
      signedBy: "Student, supervisor",
      timing: "before",
    });
  }
  out.push({
    id: "2B",
    name: "Qualified Scientist",
    legacy: "Form 2",
    why: "Needed when a Qualified Scientist is required or involved, for example BSL-2 work, human or wild-animal blood, DEA-controlled substances, carcinogens, or a non-public-domain survey instrument.",
    signedBy: "Qualified Scientist",
    timing: "before",
  });
  if (p.outsideSite) {
    out.push({
      id: "2C",
      name: "Regulated Research Institution",
      legacy: "Form 1C",
      why: "Work done anywhere other than home, school or a field site. Completed after experimentation by the site supervisor.",
      signedBy: "Site supervisor (not the student)",
      timing: "after",
    });
  }
  if (p.continuation) {
    out.push({
      id: "7",
      name: "Continuation / Research Progression",
      why: "Your project builds on earlier work. Compares only to the immediately previous year. Attach the prior abstract and research plan.",
      signedBy: "Student",
      timing: "after",
    });
  }
  return out;
}

export function signatureSteps(p: Profile): SignatureStep[] {
  const steps: SignatureStep[] = [];
  let n = 1;
  const add = (title: string, detail: string) => steps.push({ n: n++, title, detail });

  add(
    "Finish and date the research plan",
    "The plan is written before any experimentation. Later changes go in an addendum and need re-approval before work resumes.",
  );
  add(
    "Adult sponsor reviews the plan and signs Form 1",
    "Dated before your Form 1A start date.",
  );
  if (p.hazards || p.phba) {
    add(
      "Supervisor completes Form 3 (Risk Assessment)",
      "Dated before your start date. Do not write N/A. List each hazard and how you handle it.",
    );
  }
  if (p.phba) {
    add("Complete Form 6A (and 6B for tissue)", "SRC reviews before you start. Check whether your fair allows your organism at home or school.");
  }
  if (p.vertebrates && !p.outsideSite) {
    add("Complete Form 5A", "SRC pre-approval is required before any work with live vertebrates.");
  }
  if (p.humans) {
    add(
      "Get IRB review and sign Form 4",
      "Before you recruit anyone or share a survey. Minors need assent plus written parental permission, and the survey must be attached to the permission form.",
    );
  }
  add(
    "Student and parent sign Form 1B, then SRC or IRB gives prior approval",
    "Prior approval must be dated before your start date, when your project needs it.",
  );
  add("Only now start experimentation", "No data collection, recruiting or surveying before approval. Starting early is a fail-to-qualify reason.");
  if (p.outsideSite) {
    add("After experimentation: site supervisor completes Form 2C", "Signed by the site supervisor on or after your end date.");
  }
  if (p.vertebrates && p.outsideSite) {
    add("After experimentation: complete Form 5B", "Completed after the research at the regulated institution.");
  }
  if (p.continuation) {
    add("After experimentation: complete Form 7", "With last year's abstract and research plan attached.");
  }
  add("Complete Form 2A (Student Support Disclosure)", "Before or after experimentation. Include any generative AI use and keep your prompt log.");
  add("Final SRC review before competition", "Form 1B section 3. Dated after your end date.");
  return steps;
}
