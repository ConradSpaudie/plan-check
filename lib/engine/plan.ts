import { LEGACY_FORM_MAP } from "./forms";
import type { Parsed } from "./sections";
import { SECTION_DEFS } from "./sections";
import { SRC } from "./sources";
import { clip, has, matchAll, sentences, unique, words } from "./text";
import type { Detections, Finding, PassItem, Profile, SectionId } from "./types";

export interface Out {
  findings: Finding[];
  passes: PassItem[];
}

const CORE: SectionId[] = ["rationale", "question", "materials", "procedure", "safety", "analysis", "bibliography"];

/* ---------------------------------------------------------------- D1: structure */

export function checkStructure(parsed: Parsed, totalWords: number): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];

  if (totalWords < 250) {
    findings.push({
      id: "D1",
      group: "structure",
      severity: "warn",
      kind: "heuristic",
      title: `The plan is short (${totalWords} words)`,
      detail: "Complete plans usually run well over a page. Reviewers need enough detail to judge safety and rule compliance.",
      why: "The most common reason plans are returned is an incomplete procedure that a reviewer cannot judge.",
      sources: [SRC.pittsburgh, SRC.commonProblems],
    });
  }

  for (const id of CORE) {
    const def = SECTION_DEFS.find((d) => d.id === id)!;
    const info = parsed.info.find((i) => i.id === id)!;
    if (info.hasHeading) {
      if (info.words === 0) {
        findings.push({
          id: "D1",
          group: "structure",
          severity: "fix",
          kind: "deterministic",
          title: `${def.label} has a heading but no content`,
          detail: "The heading is there but nothing follows it.",
          why: "All seven core elements must be present for the plan to count as complete.",
          sources: [SRC.floridaDirections, SRC.commonProblems],
        });
      } else if (info.words < def.minWords && id !== "bibliography") {
        findings.push({
          id: "D1",
          group: "structure",
          severity: "warn",
          kind: "heuristic",
          title: `${def.label} is very short (${info.words} words)`,
          detail: "A reviewer may not be able to judge this section from so little.",
          why: id === "procedure"
            ? "Reviewers return plans whose procedure is too incomplete to judge safety or rule compliance."
            : "Each core element needs enough substance for a reviewer to assess it.",
          sources: [SRC.pittsburgh, SRC.floridaDirections],
        });
      } else {
        passes.push({ id: "D1", title: `${def.label} section found` });
      }
    } else if (info.keywordOnly) {
      findings.push({
        id: "D1",
        group: "structure",
        severity: "warn",
        kind: "heuristic",
        title: `No clear heading for ${def.label.toLowerCase()}`,
        detail: "There is content that looks related, but no heading a reviewer can find.",
        why: "Reviewers check for each required element by name. A missing label can read as a missing section.",
        askYourself: `Is your ${def.label.toLowerCase()} in the plan under a heading?`,
        sources: [SRC.floridaDirections],
      });
    } else if (id === "materials") {
      findings.push({
        id: "D1",
        group: "structure",
        severity: "warn",
        kind: "heuristic",
        title: "No materials list found",
        detail: "ISEF does not require a separate Materials heading, but reviewers need to see what you will use, with amounts and sizes, somewhere in the procedure.",
        why: "A reviewer cannot judge safety or repeatability without knowing the materials and quantities.",
        askYourself: "Could someone gather everything you need from your plan alone?",
        sources: [SRC.floridaDirections, SRC.pittsburgh],
      });
    } else {
      findings.push({
        id: "D1",
        group: "structure",
        severity: "fix",
        kind: "deterministic",
        title: `No ${def.label.toLowerCase()} section found`,
        detail: "The ISEF research plan needs a rationale, a question or hypothesis, procedures, risk and safety, data analysis and a bibliography.",
        why: "An incomplete research plan is the top paperwork problem on the Society's list.",
        sources: [SRC.commonProblems, SRC.floridaDirections],
      });
    }
  }

  // Expected outcomes or a hypothesis
  const qText = parsed.sections.question || parsed.body;
  const headedHypothesis = parsed.lines.some((l) =>
    /^\s*(?:[#*_\d.)\s]*)(hypothes[ie]s|expected outcomes?|predictions?|engineering goals?)\b/i.test(l),
  );
  const ifThen = /\bif\b[^.]{3,200}\bthen\b/i.test(qText);
  if (
    !headedHypothesis &&
    !ifThen &&
    !has(/\b(expect|predict|hypothes[ie]s|anticipate|outcome|i think|will (increase|decrease|improve|reduce))\b/i, qText)
  ) {
    findings.push({
      id: "D1",
      group: "structure",
      severity: "warn",
      kind: "heuristic",
      title: "No hypothesis or expected outcome found",
      detail: "The plan should say what you expect to find or the goal you are trying to meet.",
      why: "The question, hypothesis or engineering goal, with expected outcomes, is a required element.",
      sources: [SRC.floridaDirections],
    });
  }

  return { findings, passes };
}

/* ------------------------------------------------------- D3-D6: procedure detail */

const VAGUE =
  /\b(a few|a couple of|several|various|a lot of|a small amount|a large amount|enough|as needed|as necessary|if needed|appropriate(ly)?|standard (protocol|procedure|method)s?|the usual|etc\.?|and so on|some (amount|time|kind|sort))\b/i;

const UNITS =
  /\b\d+(?:\.\d+)?\s?(?:ml|l|g|mg|kg|[µμu]g|cm|mm|m|km|°\s?[cf]|%|min(?:ute)?s?|hours?|hrs?|days?|weeks?|months?|seconds?|sec|mv|v|ma|hz|khz|mhz|nm|[µμu]l|mol|rpm|lbs?|oz|psi|kpa|ppm|trials?|samples?|replicates?|participants?|times|degrees)(?![A-Za-z])/gi;

const SAMPLE_N =
  /\b(n\s*=\s*\d+|\d+\s+(participants?|subjects?|samples?|trials?|replicates?|groups?|plants?|mice|rats|students|respondents|volunteers|runs|repetitions|tests?|measurements?|readings?|devices?|prototypes?|images|videos)|(three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty)\s+(trials?|replicates?|repetitions|samples?|groups?|participants?|runs)|repeated?\s+(\d+|three|four|five)\s+times|in triplicate|triplicate|\d+\s+(?:\w+\s+)?(petri dishes|dishes|plates|pots|flats|cups|beakers|containers|jars|teeth|seeds|specimens|swatches|batches)|\d+\s+\w+\s+per\s+(group|flat|pot|treatment|condition))\b/i;

const CONTROL =
  /\b(control (group|condition|sample|variable|treatment|trial)s?|controls?|placebo|baseline|negative control|positive control|held constant|kept constant|remain(s)? constant|constant variables?|independent variable|dependent variable|untreated|blank|0\s?%|(the )?same (amount|type|size|temperature|conditions?|volume|light|soil|time))\b/i;

const LOCATION =
  /\b(at (home|school|the lab|my school|the university|a lab|my house)|in (my|the|a) (garage|kitchen|classroom|lab|laboratory|bedroom|home|school|basement|workshop|field)|located|location|on campus)\b/i;

const PASSIVE = /\b(is|are|was|were|will be|be|been|being)\s+(?!not\b)[a-z]+(ed|en)\b/i;
const ACTOR = /\b(i|we|my|our|student|researcher|supervisor|mentor|adult|sponsor|teacher|parent)\b/i;
const ADULT = /\b(supervisor|mentor|adult|sponsor|qualified scientist|advisor|adviser|teacher|parent|guardian)\b/i;

export function checkProcedure(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const text = parsed.procedureOrBody;
  const sents = sentences(text);
  const procWords = words(text);
  if (procWords < 20) return { findings, passes };

  // D5: vague quantifiers
  const vague = sents.filter((s) => has(VAGUE, s));
  if (vague.length >= 2) {
    findings.push({
      id: "D5",
      group: "procedure",
      severity: "warn",
      kind: "heuristic",
      title: `${vague.length} sentences use vague wording a reviewer cannot judge`,
      detail: "Phrases like 'several', 'as needed' or 'standard protocol' hide quantities, concentrations and counts.",
      why: "Plans must be detailed enough that someone else could repeat them and a reviewer could assess safety.",
      evidence: vague.slice(0, 5).map((s) => clip(s)),
      askYourself: "For each sentence, what exact amount, number or step would a stranger need to repeat it?",
      sources: [SRC.pittsburgh, SRC.floridaDirections, SRC.oregon],
    });
  } else {
    passes.push({ id: "D5", title: "No pile-up of vague wording in the procedure" });
  }

  // D4: measurements, sample size, controls, location
  const missing: string[] = [];
  const unitCount = matchAll(UNITS, text).length;
  if (unitCount === 0 && procWords >= 60) missing.push("exact quantities with units (amounts, times, temperatures)");
  if (!has(SAMPLE_N, text)) missing.push("sample size, number of trials or repetitions");
  if (!has(CONTROL, text)) missing.push("a control or the variables you will hold constant");
  const core = missing.length;
  if (!has(LOCATION, text)) missing.push("where each part is done");
  if (core >= 2) {
    findings.push({
      id: "D4",
      group: "procedure",
      severity: "warn",
      kind: "heuristic",
      title: "The procedure is missing detail reviewers look for",
      detail: `Could not find: ${missing.join("; ")}.`,
      why: "Strong plans give quantities, N per group, trials, controls and locations. Incomplete procedures are the leading reason plans come back.",
      askYourself: "If a stranger had only this section, could they repeat your work and could a reviewer judge its safety?",
      sources: [SRC.floridaDirections, SRC.pittsburgh, SRC.oregon],
    });
  } else if (missing.length >= 1) {
    findings.push({
      id: "D4",
      group: "procedure",
      severity: "verify",
      kind: "heuristic",
      title:
        missing.length === 1
          ? "One kind of detail may be missing from the procedure"
          : "Some detail may be missing from the procedure",
      detail: `Could not find: ${missing.join("; ")}. Ignore this if it does not apply to your design.`,
      why: "Reviewers want quantities, N per group, trials, controls and locations when they apply.",
      sources: [SRC.floridaDirections, SRC.oregon],
    });
  } else {
    passes.push({ id: "D4", title: "Procedure includes quantities, sample size, controls and location cues" });
  }

  // D3: actors
  if (sents.length >= 6) {
    const passiveNoActor = sents.filter((s) => has(PASSIVE, s) && !has(ACTOR, s));
    const ratio = passiveNoActor.length / sents.length;
    if (ratio >= 0.5) {
      findings.push({
        id: "D3",
        group: "procedure",
        severity: "warn",
        kind: "heuristic",
        title: "Most steps do not say who does them",
        detail: `${passiveNoActor.length} of ${sents.length} sentences are passive with no person named.`,
        why: "Plans should separate what the student does from what an adult supervisor does, so the SRC can judge who is exposed to risk.",
        evidence: passiveNoActor.slice(0, 3).map((s) => clip(s)),
        askYourself: "For each step, who does it: you, your supervisor, or someone else?",
        sources: [SRC.georgia],
      });
    }
  }
  if (!has(ADULT, text) && !has(ADULT, parsed.body)) {
    findings.push({
      id: "D3",
      group: "procedure",
      severity: "verify",
      kind: "heuristic",
      title: "No adult supervisor is mentioned",
      detail: "The plan does not mention a supervisor, mentor or sponsor anywhere.",
      why: "Reviewers need to know who supervises risky steps. If an adult does any step, the plan should say so.",
      sources: [SRC.georgia, SRC.rulesAll],
    });
  }

  // D6: results language in a plan
  const resultsRe =
    /\b(results (showed|show|indicate|indicated|demonstrate|demonstrated)|the data (showed|show|shows)|i found that|we found that|it was found that|was found to|in conclusion|my results|our results|my conclusion)\b/i;
  const resultSents = sentences(parsed.body).filter((s) => has(resultsRe, s));
  if (resultSents.length > 0) {
    findings.push({
      id: "D6",
      group: "procedure",
      severity: "warn",
      kind: "heuristic",
      title: "The plan talks about results as if they already exist",
      detail: "A research plan is written before experimentation.",
      why: "Wording like this can suggest work was already done before approval, and starting early is a fail-to-qualify reason.",
      evidence: resultSents.slice(0, 3).map((s) => clip(s)),
      askYourself: "Is this describing work you have not done yet? If you have collected data already, ask your SRC before going further.",
      sources: [SRC.floridaSupplement, SRC.failToQualify],
    });
  }

  return { findings, passes };
}

/* ------------------------------------------------------------------ safety, C8 */

export function checkSafety(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const safety = parsed.sections.safety;
  const hasHeading = parsed.info.find((i) => i.id === "safety")!.hasHeading;

  if (hasHeading) {
    const na = /^\s*(n\/?a|none|no (risks?|hazards?|safety)|not applicable|nothing)\b/i;
    if (na.test(safety) || (words(safety) < 10 && safety.length > 0)) {
      findings.push({
        id: "C8",
        group: "safety",
        severity: "fix",
        kind: "heuristic",
        title: "The risk and safety section says N/A or is nearly empty",
        detail: "Writing 'N/A' or 'None' without explaining why is a documented reason for return.",
        why: "Reviewers must see that you thought about risk, even for low-risk projects. This also applies to Form 3.",
        evidence: safety ? [clip(safety, 160)] : undefined,
        askYourself: "What could go wrong, to whom, and what do you do about it? If the honest answer is 'little', say why.",
        sources: [SRC.pittsburgh, SRC.commonProblems],
      });
      return { findings, passes };
    }
  }

  if (det.hazards.length > 0 && hasHeading) {
    const safetyLower = safety.toLowerCase();
    const missing = det.hazards.filter((h) => {
      const stem = h.term.toLowerCase().replace(/(es|s)$/, "");
      return !safetyLower.includes(stem);
    });
    if (missing.length > 0) {
      findings.push({
        id: "C8",
        group: "safety",
        severity: "warn",
        kind: "heuristic",
        title: `${missing.length} hazard(s) in your plan are not covered in risk and safety`,
        detail: `Mentioned elsewhere but not in the safety section: ${unique(missing.map((m) => m.term.toLowerCase())).join(", ")}.`,
        why: "Each hazardous item should appear in risk and safety with a precaution and a disposal line.",
        evidence: missing.slice(0, 3).map((m) => clip(m.sentence)),
        askYourself: "For each item, what is the risk, how do you handle it, and how do you dispose of it?",
        sources: [SRC.pittsburgh, SRC.floridaDirections],
      });
    }
    const ppe = /\b(goggles|gloves|ppe|lab coat|apron|mask|respirator|ear protection|helmet|fire extinguisher|first aid|ventilat\w+|eye ?wash|safety glasses|face shield)\b/i;
    if (!has(ppe, safety)) {
      findings.push({
        id: "C8",
        group: "safety",
        severity: "warn",
        kind: "heuristic",
        title: "No protective equipment or precautions found in the safety section",
        detail: "Your plan mentions hazardous items, but the safety section names no protective equipment.",
        why: "Missing safety precautions is a leading reason plans are returned.",
        sources: [SRC.pittsburgh, SRC.floridaDirections],
      });
    }
    const disposal = /\b(dispos\w+|discard\w*|autoclav\w+|neutraliz\w+|waste|recycl\w+|drain|sealed container|sharps)\b/i;
    if (!has(disposal, safety)) {
      findings.push({
        id: "C8",
        group: "safety",
        severity: "warn",
        kind: "heuristic",
        title: "No disposal plan found",
        detail: "The safety section does not say how waste or used materials are disposed of.",
        why: "Disposal is expected in risk and safety, especially for chemicals and biological material.",
        sources: [SRC.floridaDirections, SRC.pittsburgh],
      });
    }
  } else if (hasHeading) {
    passes.push({ id: "C8", title: "Risk and safety section has real content" });
  }

  if (profile.hazards && det.hazards.length === 0 && !hasHeading) {
    findings.push({
      id: "C8",
      group: "safety",
      severity: "warn",
      kind: "heuristic",
      title: "You ticked hazardous items but the plan never names a hazard",
      detail: "Form 3 and the plan should list each hazardous chemical, activity or device.",
      why: "Reviewers cannot approve what the plan does not describe.",
      sources: [SRC.pittsburgh],
    });
  }

  return { findings, passes };
}

/* ------------------------------------------------------------------ D7: analysis */

export function checkAnalysis(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const info = parsed.info.find((i) => i.id === "analysis")!;
  if (!info.hasHeading || info.words === 0) return { findings, passes };
  const methods =
    /\b(t-?test|anova|chi-?square|chi square|regression|correlation|pearson|spearman|mann-?whitney|wilcoxon|kruskal|mean|median|standard deviation|standard error|confidence interval|p-?value|significan(t|ce)|error bars|statistical|bootstrap|bayesian|accuracy|precision|recall|f1|cross-?validation|rmse|mse|graph|plot|chart|compare)\b/i;
  if (!has(methods, parsed.sections.analysis)) {
    findings.push({
      id: "D7",
      group: "analysis",
      severity: "warn",
      kind: "heuristic",
      title: "The data analysis section does not name a method",
      detail: "Could not find a statistical test, summary measure, or way you will compare results.",
      why: "Data analysis is a required element. This is a quality signal, not a documented return reason, but reviewers read it.",
      askYourself: "What will you calculate or plot, and what will you compare it against?",
      sources: [SRC.floridaDirections, SRC.oregon],
    });
  } else {
    passes.push({ id: "D7", title: "Data analysis names a method" });
  }
  return { findings, passes };
}

/* ------------------------------------------------------------- D8: bibliography */

export function bibEntries(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const numberedRe = /^(\[\d+\]|\d+[.)])\s*/;
  const numbered = lines.filter((l) => numberedRe.test(l)).length;
  const out: string[] = [];
  if (lines.length > 0 && numbered >= Math.max(2, lines.length / 2)) {
    for (const l of lines) {
      if (numberedRe.test(l)) out.push(l.replace(numberedRe, ""));
      else if (out.length) out[out.length - 1] += " " + l;
    }
    return out;
  }
  for (const l of lines) {
    const prev = out[out.length - 1];
    const isUrlOnly = /^(https?:\/\/|doi:|www\.)\S+$/i.test(l);
    const prevIsRich = prev !== undefined && words(prev.replace(/https?:\/\/\S+/g, "")) >= 6;
    const cont =
      prev !== undefined &&
      ((isUrlOnly && prevIsRich && !/https?:\/\//i.test(prev)) ||
        (!isUrlOnly && /^[a-z(]/.test(l)) ||
        (words(l) < 4 && !isUrlOnly));
    if (cont) out[out.length - 1] += " " + l;
    else out.push(l);
  }
  return out;
}

export function checkBibliography(parsed: Parsed): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const info = parsed.info.find((i) => i.id === "bibliography")!;
  if (!info.hasHeading || info.words === 0) return { findings, passes };

  const entries = bibEntries(parsed.sections.bibliography);
  const n = entries.length;

  if (n < 5) {
    findings.push({
      id: "D8",
      group: "bibliography",
      severity: "warn",
      kind: "heuristic",
      title: `Only ${n} bibliography ${n === 1 ? "entry" : "entries"} found`,
      detail: "Many fairs ask for at least five sources. This is a fair-level norm, not an ISEF-international rule, so check yours.",
      why: "An incomplete or thin bibliography is a documented reason plans are returned.",
      sources: [SRC.pittsburgh, SRC.floridaSupplement, SRC.commonProblems],
    });
  } else {
    passes.push({ id: "D8", title: `${n} bibliography entries found` });
  }

  const bare = entries.filter(
    (e) => /(https?:\/\/|www\.|doi:)/i.test(e) && words(e.replace(/(https?:\/\/|www\.)\S+/gi, "").replace(/doi:\S+/gi, "")) < 4,
  );
  if (bare.length > 0) {
    findings.push({
      id: "D8",
      group: "bibliography",
      severity: "fix",
      kind: "heuristic",
      title: `${bare.length} bibliography ${bare.length === 1 ? "entry is" : "entries are"} just a link`,
      detail: "Entries need an author or organization, title, source and date, not only a URL.",
      why: "References must be properly formatted and verified. Bare URLs are a common formatting problem.",
      evidence: bare.slice(0, 3).map((b) => clip(b, 120)),
      sources: [SRC.floridaSupplement, SRC.pittsburgh],
    });
  }

  const noYear = entries.filter((e) => !/\b(19|20)\d{2}\b/.test(e) && words(e.replace(/https?:\/\/\S+/gi, "")) >= 4);
  if (noYear.length > 0) {
    findings.push({
      id: "D8",
      group: "bibliography",
      severity: "verify",
      kind: "heuristic",
      title: `${noYear.length} ${noYear.length === 1 ? "entry has" : "entries have"} no year`,
      detail: "A reviewer cannot tell how current or findable the source is.",
      why: "Properly formatted references include a date.",
      evidence: noYear.slice(0, 3).map((e) => clip(e, 120)),
      sources: [SRC.floridaSupplement],
    });
  }

  // In-text citations
  const body = parsed.body;
  const numericCites = new Set<number>();
  for (const m of matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g, body)) {
    for (const part of m[1].split(",")) {
      const range = part.split(/[–-]/).map((x) => parseInt(x.trim(), 10));
      if (range.length === 2 && !Number.isNaN(range[0]) && !Number.isNaN(range[1]) && range[1] >= range[0] && range[1] - range[0] < 30) {
        for (let k = range[0]; k <= range[1]; k++) numericCites.add(k);
      } else if (!Number.isNaN(range[0])) numericCites.add(range[0]);
    }
  }
  const authorCites = matchAll(/\(\s?([A-Z][A-Za-z'’-]+)(?: et al\.| and [A-Z][A-Za-z'’-]+| & [A-Z][A-Za-z'’-]+)?,? ((?:19|20)\d{2}[a-z]?)\s?\)/g, body);

  if (numericCites.size === 0 && authorCites.length === 0) {
    if (n > 0) {
      findings.push({
        id: "D8",
        group: "bibliography",
        severity: "warn",
        kind: "heuristic",
        title: "No in-text citations found",
        detail: "The bibliography has entries, but the plan never cites them in the text.",
        why: "The rationale should work in citations to the sources you read, and each citation should match a bibliography entry.",
        askYourself: "Which sentence in your rationale relies on which source?",
        sources: [SRC.floridaDirections, SRC.oregon],
      });
    }
  } else {
    if (numericCites.size > 0) {
      const over = Array.from(numericCites).filter((k) => k > n).sort((a, b) => a - b);
      if (over.length > 0) {
        findings.push({
          id: "D8",
          group: "bibliography",
          severity: "fix",
          kind: "heuristic",
          title: `In-text citation [${over[0]}] has no matching bibliography entry`,
          detail: `The plan cites ${over.map((o) => `[${o}]`).join(", ")} but only ${n} entries were found.`,
          why: "Citations and the bibliography must match.",
          sources: [SRC.floridaSupplement, SRC.pittsburgh],
        });
      }
      const uncited: number[] = [];
      for (let k = 1; k <= n; k++) if (!numericCites.has(k)) uncited.push(k);
      if (uncited.length > 0 && n > 0) {
        findings.push({
          id: "D8",
          group: "bibliography",
          severity: "verify",
          kind: "heuristic",
          title: `${uncited.length} bibliography ${uncited.length === 1 ? "entry is" : "entries are"} never cited in the text`,
          detail: `Entries ${uncited.map((u) => `[${u}]`).join(", ")} do not appear as in-text citations.`,
          why: "Every source listed should be used and cited.",
          sources: [SRC.floridaSupplement],
        });
      }
    }
    const bibLower = parsed.sections.bibliography.toLowerCase();
    const missingAuthors = unique(
      authorCites
        .map((m) => m[1])
        .filter((a) => !bibLower.includes(a.toLowerCase())),
    );
    if (missingAuthors.length > 0) {
      findings.push({
        id: "D8",
        group: "bibliography",
        severity: "fix",
        kind: "heuristic",
        title: `${missingAuthors.length} in-text citation${missingAuthors.length === 1 ? "" : "s"} not found in the bibliography`,
        detail: `Cited but not listed: ${missingAuthors.join(", ")}.`,
        why: "Citations and the bibliography must match.",
        sources: [SRC.floridaSupplement, SRC.pittsburgh],
      });
    }
  }

  // Verifiability: the student must check every citation is real
  const linked = entries.filter((e) => /(doi:|10\.\d{4,}\/|https?:\/\/)/i.test(e)).length;
  if (n >= 3 && linked / n < 0.4) {
    findings.push({
      id: "D8",
      group: "bibliography",
      severity: "verify",
      kind: "heuristic",
      title: "Few entries include a DOI or link",
      detail: `${linked} of ${n} entries have one.`,
      why: "You are responsible for verifying every citation exists. AI tools can invent references that look real, and AI may not be used to create citations.",
      sources: [SRC.aiTable, SRC.floridaSupplement],
    });
  }

  return { findings, passes };
}

/* ----------------------------------------------------------- A1: form numbering */

export function checkFormNumbers(plan: string): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const hits: { legacy: string; sentence: string }[] = [];
  for (const s of sentences(plan)) {
    if (/\bForms?\s*1C\b/i.test(s)) hits.push({ legacy: "1C", sentence: s });
    else if (/\bForms?\s*2(?![A-Za-z0-9])/i.test(s)) hits.push({ legacy: "2", sentence: s });
  }
  if (hits.length > 0) {
    const kinds = unique(hits.map((h) => h.legacy));
    findings.push({
      id: "A1",
      group: "forms",
      severity: "warn",
      kind: "deterministic",
      title: "Your plan uses old form numbers",
      detail: kinds
        .map((k) => `Form ${k} is now Form ${LEGACY_FORM_MAP[k].now} (${LEGACY_FORM_MAP[k].name}) for 2026-27.`)
        .join(" "),
      why: "Form numbers changed this cycle, and old guides still circulate. Official pages are inconsistent too, so check the form itself.",
      evidence: hits.slice(0, 3).map((h) => clip(h.sentence)),
      sources: [SRC.formsPage, SRC.rulesBook2526, SRC.overview],
    });
  }
  return { findings, passes };
}

/* ----------------------------------------------- A4/A5/C10: routing and triggers */

function terms(hs: { term: string }[]): string {
  return unique(hs.map((h) => h.term.toLowerCase())).join(", ");
}

export function checkRouting(det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];

  const rows: {
    key: keyof Profile;
    hits: Detections[keyof Detections];
    what: string;
    form: string;
    ask: string;
    source: (typeof SRC)[keyof typeof SRC];
  }[] = [
    {
      key: "humans",
      hits: det.humans,
      what: "human participants",
      form: "Form 4 and IRB review before you start",
      ask: "Will people take a survey, be interviewed or be tested? If so, tick human participants.",
      source: SRC.human,
    },
    {
      key: "vertebrates",
      hits: det.vertebrates,
      what: "live vertebrate animals",
      form: "Form 5A or 5B and SRC pre-approval",
      ask: "Are live vertebrates involved? If so, tick vertebrate animals.",
      source: SRC.rulesAll,
    },
    {
      key: "phba",
      hits: det.phba,
      what: "potentially hazardous biological agents",
      form: "Form 6A (and 6B for tissue) and SRC review",
      ask: "Are microorganisms, tissue, blood or similar involved? If so, tick biological agents.",
      source: SRC.phba,
    },
    {
      key: "hazards",
      hits: det.hazards,
      what: "hazardous chemicals, activities or devices",
      form: "Form 3 (Risk Assessment)",
      ask: "Do you handle any of these? If so, tick hazards and describe each in risk and safety.",
      source: SRC.rulesAll,
    },
    {
      key: "outsideSite",
      hits: det.outsideSite,
      what: "work at an outside institution",
      form: "Form 2C, signed by the site supervisor after experimentation",
      ask: "Is any work done outside home, school or a field site? If so, tick outside lab.",
      source: SRC.form2C,
    },
    {
      key: "continuation",
      hits: det.continuation,
      what: "a continuation of earlier work",
      form: "Form 7, with last year's abstract and plan",
      ask: "Does this build on a previous project? If so, tick continuation.",
      source: SRC.form7,
    },
  ];

  for (const r of rows) {
    const detected = (r.hits as { term: string; sentence: string }[]).length > 0;
    const ticked = profile[r.key];
    if (detected && !ticked) {
      findings.push({
        id: "A5",
        group: "forms",
        severity: "warn",
        kind: "heuristic",
        title: `Your plan seems to involve ${r.what}, but it is not ticked`,
        detail: `Matched: ${terms(r.hits as { term: string }[])}. That usually means ${r.form}.`,
        why: "Missing forms and missing prior approval are among the most common reasons for return, and projects started without approval can fail to qualify.",
        evidence: (r.hits as { sentence: string }[]).slice(0, 3).map((h) => clip(h.sentence)),
        askYourself: r.ask,
        sources: [r.source, SRC.commonProblems],
      });
    }
  }

  if (det.qualifiedScientist.length > 0) {
    findings.push({
      id: "C10",
      group: "forms",
      severity: "verify",
      kind: "heuristic",
      title: "Your plan may need a Qualified Scientist (Form 2B)",
      detail: `Matched: ${terms(det.qualifiedScientist)}. A Qualified Scientist is required for things like BSL-2 work, human or wild-animal blood, DEA-controlled substances, carcinogens, or a non-public-domain survey instrument.`,
      why: "Mixing up a Qualified Scientist and a designated supervisor is on the Society's list of common errors.",
      evidence: det.qualifiedScientist.slice(0, 2).map((h) => clip(h.sentence)),
      sources: [SRC.human, SRC.phba, SRC.commonProblems],
    });
  }

  if (profile.team) {
    findings.push({
      id: "C2",
      group: "forms",
      severity: "verify",
      kind: "deterministic",
      title: "Teams: each member needs their own Form 1B",
      detail: "One Form 1, one Form 1A, one plan and one Form 2A per team, but a separate Form 1B for every team member.",
      why: "A single shared Form 1B is a common team error.",
      sources: [SRC.rulesAll, SRC.missouri],
    });
  }

  return { findings, passes };
}

/* ---------------------------------------------------------------------- AI use */

export function checkAI(parsed: Parsed, det: Detections, profile: Profile): Out {
  const findings: Finding[] = [];
  const passes: PassItem[] = [];
  const text = parsed.sections.ack + "\n" + parsed.body;
  const statement = /\b(ai (was|were) used|i used (chatgpt|claude|gemini|copilot|an? ai)|prompt log|generative ai|ai[- ]use (statement|log)|ai tool)/i;

  if (profile.usesAI && !has(statement, text)) {
    findings.push({
      id: "D2",
      group: "ai",
      severity: "warn",
      kind: "heuristic",
      title: "You use AI, but the plan has no AI-use statement",
      detail: "AI use must be cited with explicit acknowledgement and a log of prompts. Form 2A also asks how AI was used.",
      why: "Inappropriate AI use is grounds to fail to qualify. Fairs may be stricter than the Society's table.",
      askYourself: "Which tools did you use, for what, and where is your prompt log?",
      sources: [SRC.aiTable, SRC.form2A, SRC.rulesAll],
    });
  } else if (!profile.usesAI && det.aiUsed.length > 0) {
    findings.push({
      id: "D2",
      group: "ai",
      severity: "warn",
      kind: "heuristic",
      title: "Your plan mentions AI use, but the box is not ticked",
      detail: "If you used an AI tool in this project, say so on Form 2A and keep the prompt log.",
      why: "AI use must be disclosed and cited. Generative AI may not write the plan, abstract, poster or citations.",
      evidence: det.aiUsed.slice(0, 2).map((h) => clip(h.sentence)),
      sources: [SRC.aiTable, SRC.form2A],
    });
  } else if (profile.usesAI) {
    passes.push({ id: "D2", title: "An AI-use statement is present" });
  }
  return { findings, passes };
}
