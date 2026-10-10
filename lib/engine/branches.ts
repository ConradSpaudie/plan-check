import { SRC } from "./sources";
import { clip, has, sentences } from "./text";
import type { Parsed } from "./sections";
import type { Detections, Finding, PassItem, Profile } from "./types";

export interface Out {
  findings: Finding[];
  passes: PassItem[];
}

/** Which checklist items are missing from `text`. */
function missingItems(text: string, items: { label: string; re: RegExp }[]): string[] {
  return items.filter((i) => !has(i.re, text)).map((i) => i.label);
}

/* ------------------------------------------------------------ E1-E3: human participants */

const HUMAN_ITEMS = [
  { label: "who the participants are (age range, group)", re: /\b(ages?|aged|years? old|grades?|adults?|18\+|over 18|under 18|students|members of|residents)\b/i },
  { label: "how you will recruit them", re: /\b(recruit\w*|invit\w*|flyer|advertis\w*|email(ed)?|post(ed)? (a )?sign|solicit\w*|word of mouth|mailing list|enroll\w*)\b/i },
  { label: "informed consent or assent", re: /\b(consent|assent|permission form|waiver)\b/i },
  { label: "risks to participants (physical, psychological, social, legal)", re: /\b(risk|harm|discomfort|stress|distress|embarrass\w*|minimal risk|psychological)\b/i },
  { label: "benefits", re: /\bbenefit/i },
  { label: "privacy and data handling (anonymous or identifiable, storage, access)", re: /\b(anonym\w*|confidential\w*|de-?identif\w*|pseudonym\w*|identifiable|encrypt\w*|password|delete\w*|destroy\w*|secure\w*|protected)\b/i },
  { label: "how long it takes per participant", re: /\b(\d+\s*(minutes?|mins?|hours?|sessions?)|duration|takes? about|time commitment)\b/i },
  { label: "where the survey or test comes from", re: /\b(validated|adapted from|instrument|scale|questionnaire (from|developed|created)|my own (survey|questions)|self-?(designed|made|created)|permission to use|copyright|cite\w*)\b/i },
];

export function checkHuman(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const active = profile.humans || det.humans.length > 0;
  if (!active) return { findings, passes };
  const text = parsed.body;

  if (profile.humans && det.humans.length === 0) {
    findings.push({
      id: "E1",
      group: "human",
      severity: "warn",
      kind: "heuristic",
      title: "You ticked human participants, but the plan never describes any",
      detail: "Could not find survey, interview, participant or similar wording.",
      why: "The IRB reviews what the plan says. Participants, recruitment, consent, risks and privacy must be in the plan.",
      sources: [SRC.human, SRC.form4],
    });
    return { findings, passes };
  }

  const missing = missingItems(text, HUMAN_ITEMS);
  if (missing.length >= 3) {
    findings.push({
      id: "E1",
      group: "human",
      severity: "warn",
      kind: "heuristic",
      title: "The plan is missing human participant detail",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "Human participant plans must describe these items for the IRB. Surveys used without prior IRB review, and missing consent, are on the Society's fail-to-qualify list.",
      askYourself: "Would an IRB member reading only this plan know who is involved, how they are protected, and how their data is handled?",
      sources: [SRC.human, SRC.form4, SRC.failToQualify],
    });
  } else if (missing.length > 0) {
    findings.push({
      id: "E1",
      group: "human",
      severity: "verify",
      kind: "heuristic",
      title: "A few human participant details may be missing",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "The IRB expects these in the plan when they apply.",
      sources: [SRC.human, SRC.form4],
    });
  } else {
    passes.push({ id: "E1", title: "Human participant plan covers who, recruitment, consent, risk and privacy" });
  }

  // E2: minors
  if (det.minors.length > 0) {
    const parental = /\bparent(al|s)?\b.*\b(permission|consent)\b|\b(permission|consent)\b.*\bparent(al|s)?\b|\bguardian\b/i;
    if (!has(parental, text)) {
      findings.push({
        id: "E2",
        group: "human",
        severity: "fix",
        kind: "heuristic",
        title: "Participants may be under 18, but no parental permission is mentioned",
        detail: "Minors need their own assent plus written parental permission. For minors, the survey must be attached to the permission form.",
        why: "Adult consent can be waived only when risk is minimal and data is anonymous, and an anonymous survey of minors still needs parental permission.",
        evidence: det.minors.slice(0, 2).map((h) => clip(h.sentence)),
        sources: [SRC.human, SRC.form4],
      });
    } else {
      passes.push({ id: "E2", title: "Parental permission is mentioned for minors" });
    }
  }

  // E3: advice and results back to participants (2027 change, from a regional summary)
  const adviceRe = /\b((medical|reading|health|personal) advice|give (them |participants )?advice|diagnostic (information|results|feedback)|give (them |participants )?a diagnosis|medical (information|advice)|give (participants|them) (their )?(results|data|feedback|scores?)|share (the )?(results|data) with participants|tell participants (their|the) (results|scores?))\b/i;
  const adviceSents = sentences(text).filter(
    (s) => has(adviceRe, s) && !/\b(no|not|never|won't|will not|none)\b/i.test(s),
  );
  if (adviceSents.length > 0) {
    findings.push({
      id: "E3",
      group: "human",
      severity: "verify",
      kind: "heuristic",
      title: "Participants may receive advice, diagnostic information or study data",
      detail: "A regional summary of the 2027 rules says participants may not be given advice, diagnostic information or study data. This was not confirmed on the Society's own page.",
      why: "Changes to participant-facing rules can trigger a return.",
      evidence: adviceSents.slice(0, 2).map((s) => clip(s)),
      sources: [SRC.scvsefa, SRC.human],
    });
  }

  return { findings, passes };
}

/* --------------------------------------------------------------- E5: vertebrate animals */

const ANIMAL_ITEMS = [
  { label: "alternatives to animal use", re: /\b(alternativ\w*|replace\w*|reduc\w*|refin\w*|3rs?)\b/i },
  { label: "how many animals and why that number", re: /\b(\d+\s+(mice|rats|animals|fish|birds|rabbits|hamsters|frogs)|sample size|power analysis|justif\w*)\b/i },
  { label: "species, strain, sex, age and source", re: /\b(species|strain|sex|male|female|age|supplier|purchased|obtained|source)\b/i },
  { label: "housing and daily care", re: /\b(cage|housing|enrichment|feeding|water|daily (care|check)|light cycle|husbandry|tank)\b/i },
  { label: "humane endpoints", re: /\b(endpoint|euthan\w*|humane|pain|distress|observ\w* for)\b/i },
  { label: "veterinarian or SRC approval", re: /\b(veterinar\w*|iacuc|src|approval|approved)\b/i },
];

export function checkAnimals(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  if (!(profile.vertebrates || det.vertebrates.length > 0)) return { findings, passes };
  const missing = missingItems(parsed.body, ANIMAL_ITEMS);
  if (missing.length >= 3) {
    findings.push({
      id: "E5",
      group: "animals",
      severity: "warn",
      kind: "heuristic",
      title: "The plan is missing vertebrate animal detail",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "Reviewers pay close attention to procedures and care of animals, and to whether alternatives were considered. Work without prior approval fails to qualify.",
      sources: [SRC.floridaDirections, SRC.rulesAll, SRC.failToQualify],
    });
  } else if (missing.length > 0) {
    findings.push({
      id: "E5",
      group: "animals",
      severity: "verify",
      kind: "heuristic",
      title: "A few animal-care details may be missing",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "Vertebrate projects need detailed care and procedure information.",
      sources: [SRC.floridaDirections],
    });
  }
  return { findings, passes };
}

/* -------------------------------------------------------- E6/C7: biological agents */

const BIO_ITEMS = [
  { label: "where the organism or material comes from", re: /\b(source|purchased|obtained|atcc|supplier|commercial|kit|ordered)\b/i },
  { label: "biosafety level", re: /\b(bsl|biosafety)\b/i },
  { label: "disposal (autoclave, bleach, disinfect)", re: /\b(autoclav\w*|bleach|disinfect\w*|steriliz\w*|dispos\w*)\b/i },
  { label: "precautions (gloves, aseptic technique, hood)", re: /\b(gloves|goggles|lab coat|ppe|aseptic|sterile technique|hood|mask|wash\w* hands)\b/i },
];

export function checkBio(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  if (!(profile.phba || det.phba.length > 0)) return { findings, passes };

  // C7: home culturing
  const homeRe = /\b(at home|my home|in (my|the) (kitchen|garage|bedroom|basement|home|house)|kitchen|garage|bedroom|basement)\b/i;
  const cultureRe = /\b(cultur\w*|incubat\w*|petri|agar|bacteria|mold|mould|fung\w*|swab\w*|colon(y|ies)|grow\w*)\b/i;
  const homeSents = sentences(parsed.body).filter((s) => has(homeRe, s) && has(cultureRe, s));
  if (homeSents.length > 0) {
    findings.push({
      id: "C7",
      group: "bio",
      severity: "fix",
      kind: "heuristic",
      title: "The plan may culture microorganisms at home",
      detail: "Several fairs prohibit culturing bacteria, mold or other potentially hazardous biological agents at home.",
      why: "Home culturing is flagged by regional SRCs as a reason for return, and handling and disposal details are checked closely.",
      evidence: homeSents.slice(0, 2).map((s) => clip(s)),
      askYourself: "Where exactly will the culturing happen, and does your fair allow it there? Ask your SRC before you start.",
      sources: [SRC.pittsburgh, SRC.missouri, SRC.phba],
    });
  }

  const missing = missingItems(parsed.body, BIO_ITEMS);
  if (missing.length >= 2) {
    findings.push({
      id: "E6",
      group: "bio",
      severity: "warn",
      kind: "heuristic",
      title: "The plan is missing biological agent detail",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "Reviewers look for the source, biosafety level, precautions and disposal for any biological material.",
      sources: [SRC.phba, SRC.floridaDirections, SRC.pittsburgh],
    });
  }
  return { findings, passes };
}

/* -------------------------------------------------------------- E7: computational */

export function checkComputational(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  if (det.dataset.length === 0) return { findings, passes };
  const text = parsed.body;

  const sourceRe = /\b(downloaded from|collected from|publicly available|public (dataset|data)|open data|source|kaggle|github|hugging ?face|uci|imagenet)\b/i;
  const licenseRe = /\b(licen[sc]e|terms of (use|service)|cc-?by|mit license|open data|public domain)\b/i;
  const anonRe = /\b(anonymi[sz]\w*|de-?identif\w*|public domain|publicly available|no personal|does not contain (any )?personal)\b/i;

  const notes: string[] = [];
  if (!has(sourceRe, text)) notes.push("where the data comes from");
  if (!has(licenseRe, text)) notes.push("the data's license or terms of use");
  if (notes.length > 0) {
    findings.push({
      id: "E7",
      group: "computational",
      severity: "verify",
      kind: "heuristic",
      title: "A data-driven project should say where its data comes from",
      detail: `Could not find: ${notes.join("; ")}. The Society has no coding-specific plan rule, so this is a quality check.`,
      why: "Reviewers need to judge whether the data involves people and whether you may use it.",
      sources: [SRC.rulesAll],
    });
  }

  if (det.identifiers.length > 0 && !has(anonRe, text) && !profile.humans) {
    findings.push({
      id: "E7",
      group: "computational",
      severity: "warn",
      kind: "heuristic",
      title: "Your data may contain personal information",
      detail: `Matched: ${det.identifiers.map((h) => h.term).join(", ")}. Data that identifies people can make the project human participant research.`,
      why: "Public, published datasets are exempt from IRB review. Data you collect, or identifiable data, is not.",
      evidence: det.identifiers.slice(0, 2).map((h) => clip(h.sentence)),
      askYourself: "Is the data public and de-identified, or does it identify real people? If it identifies people, ask your SRC about Form 4.",
      sources: [SRC.human, SRC.rulesAll],
    });
  }
  return { findings, passes };
}
