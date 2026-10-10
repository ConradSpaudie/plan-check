import type { Detections, Hit, Profile } from "./types";
import { sentences, unique } from "./text";

/**
 * Keyword triggers. These are heuristics: they look for words that usually mean a project
 * needs a form. The student confirms before anything is reported as a fix.
 */

const HUMANS =
  /\b(surveys?|questionnaires?|interviews?|interviewees?|participants?|respondents?|volunteers?|focus groups?|informed consent|human subjects?|human participants?|test subjects?|usability tests?|user tests?|user testing|user study|beta testers?|classmates|my friends|family members|crowd ?work(ers)?|mturk|prolific)\b/i;

const VERTEBRATES =
  /\b(mice|mouse|rats?|zebrafish|fish|birds?|chickens?|hens?|rabbits?|dogs?|cats?|hamsters?|guinea pigs?|gerbils?|frogs?|tadpoles?|lizards?|snakes?|turtles?|pigs?|primates?|monkeys?|vertebrates?|livestock)\b/i;

const PHBA =
  /\b(bacteria|bacterial|e\.?\s?coli|petri dish(es)?|agar|mold|mould|fung(i|us|al)|microbes?|microbial|microbiome|microorganisms?|pathogens?|plasmids?|crispr|rdna|recombinant|cell lines?|tissue (?:samples?|cultures?|specimens?)|extracted teeth|human teeth|blood|saliva|urine|swabs?|compost (samples?|tea|microb\w*)|yeast|bacillus|streptococc\w*|salmonella|colonies|incubat(e|ed|ing|or|ion)|gram[- ](positive|negative)|antibiotic resistan\w*)\b/i;

const HAZARDS =
  /\b(acids?|hydrochloric|sulfuric|nitric|acetic|sodium hydroxide|lye|bleach|ammonia|chlorine|peroxide|solvents?|acetone|ethanol|isopropyl|methanol|formaldehyde|flammable|flames?|burners?|bunsen|hot plates?|boiling|soldering|solder|lasers?|uv light|ultraviolet|radiation|x-rays?|high voltage|mains|lithium|li-ion|batter(y|ies)|explosives?|rockets?|fireworks|firearms?|drones?|chainsaw|power tools?|knife|scalpel|blades?|centrifuge|autoclave|pesticides?|herbicides?|fertili[sz]ers?|heavy metals?|copper sulfate|cuso4|lead nitrate|mercury|arsenic|carcinogens?|toxic|nanoparticles?|3d printer|dry ice|liquid nitrogen)\b/i;

const OUTSIDE_WORDS =
  /\b(university|college lab|laborator(y|ies) at|lab at|hospital|medical center|research institute|research institution|national laborator(y|ies)|industrial setting|company'?s lab|mentor'?s lab|berkeley lab|lawrence berkeley)\b/i;
// Acronyms are case sensitive so "uc" in other words never matches.
const OUTSIDE_ACRONYMS = /\b(NASA|LBNL|SLAC|CERN|Fermilab|UCSF|UCLA|UCSD|MIT|Caltech|NIH|CDC|UC (Berkeley|Davis|Santa Cruz|Merced|Irvine|Riverside|San Diego|Santa Barbara))\b/;

const CONTINUATION =
  /\b(continuation|continues? (my|our|a previous|last year)|(my|our) (previous|prior|earlier|last year'?s?) (year|project|work|research|experiment|study)|last year'?s? (project|experiment|study)|extends? (my|our) (previous|prior|earlier|last)|expand(s|ing)? (on )?(my|our)|follow-?up to my|second year (of|on)|year (two|2) of)\b/i;

const QS =
  /\b(bsl-?2|biosafety level 2|dea|controlled substances?|schedule (i|ii|iii|iv)|human blood|blood samples?|wild animals?|carcinogens?|non-?public|validated instrument|copyrighted (survey|questionnaire)|proprietary (survey|instrument))\b/i;

const MINORS =
  /\b(minors?|under 18|under the age of 18|under age 18|middle school(ers)?|high school (students|participants)|teenagers?|teens|children|kids|grades? (6|7|8|9|10|11|12|k)|ages? (1[0-7]|[5-9])\b|(1[0-7]) ?(-|to) ?(1[0-8]) years?)\b/i;

const DATASET =
  /\b(datasets?|data sets?|kaggle|training data|web scrap(e|ed|ing)|scraped|machine learning|neural networks?|deep learning|llm|fine-?tun(e|ing)|model training)\b/i;

const IDENTIFIERS =
  /\b(patients?|medical records?|health records?|faces?|facial|photos? of (people|students)|names?|emails?|usernames?|social media posts?|tweets?|biometric|voice recordings?)\b/i;

const AI_USED =
  /\b(i used (chatgpt|claude|gemini|copilot|perplexity|an? ai)|ai (was|were) used|used (chatgpt|claude|gemini|copilot|perplexity)|with the help of (chatgpt|claude|gemini|copilot|ai)|generated (by|with|using) (chatgpt|claude|gemini|copilot|ai)|prompt log)\b/i;

const NEGATION = /\b(no|not|n't|without|never|none|nor|neither|free of|free from|avoid(s|ing)?|instead of)\b/i;

/** True when a negation word sits just before the match, as in "no high voltage is exposed". */
function negated(sentence: string, index: number): boolean {
  return NEGATION.test(sentence.slice(Math.max(0, index - 40), index));
}

function hits(re: RegExp, all: string[], limit = 4, allowNegated = false): Hit[] {
  const out: Hit[] = [];
  const seen = new Set<string>();
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const s of all) {
    for (const m of s.matchAll(g)) {
      if (!allowNegated && negated(s, m.index ?? 0)) continue;
      const term = m[0].toLowerCase();
      if (seen.has(term)) break;
      seen.add(term);
      out.push({ term: m[0], sentence: s });
      break;
    }
    if (out.length >= limit) break;
  }
  return out;
}

export function detect(body: string): Detections {
  const all = sentences(body);
  const outside = unique([
    ...hits(OUTSIDE_WORDS, all, 2),
    ...hits(OUTSIDE_ACRONYMS, all, 2),
  ]);
  return {
    humans: hits(HUMANS, all),
    vertebrates: hits(VERTEBRATES, all),
    phba: hits(PHBA, all),
    hazards: hits(HAZARDS, all, 6),
    outsideSite: outside,
    continuation: hits(CONTINUATION, all, 2),
    qualifiedScientist: hits(QS, all, 3),
    minors: hits(MINORS, all, 2),
    dataset: hits(DATASET, all, 2),
    identifiers: hits(IDENTIFIERS, all, 3),
    aiUsed: hits(AI_USED, all, 2),
  };
}

/** What the plan suggests the profile should be. The UI uses this to pre-tick boxes. */
export function suggestProfile(d: Detections): Partial<Profile> {
  return {
    humans: d.humans.length > 0,
    vertebrates: d.vertebrates.length > 0,
    phba: d.phba.length > 0,
    hazards: d.hazards.length > 0,
    outsideSite: d.outsideSite.length > 0,
    continuation: d.continuation.length > 0,
    usesAI: d.aiUsed.length > 0,
  };
}

export const emptyProfile: Profile = {
  humans: false,
  vertebrates: false,
  phba: false,
  hazards: false,
  outsideSite: false,
  continuation: false,
  team: false,
  usesAI: false,
};
