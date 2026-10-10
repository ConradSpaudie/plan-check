import type { SectionId, SectionInfo } from "./types";
import { has, words } from "./text";

interface SectionDef {
  id: SectionId;
  label: string;
  head: RegExp;
  /** Content keywords used when there is no heading. */
  kw: RegExp;
  minWords: number;
}

export const SECTION_DEFS: SectionDef[] = [
  {
    id: "rationale",
    label: "Rationale / background",
    head: /(rationale|background( research)?|introduction|purpose|motivation|literature review|context|significance)/i,
    kw: /\b(background|previous(ly)? (studies|research)|prior (work|research)|researchers? (have|has)|studies (have )?show|it is known|literature)\b/i,
    minWords: 60,
  },
  {
    id: "question",
    label: "Question, hypothesis or engineering goal",
    head: /(research questions?|questions?|hypothes[ie]s|engineering goals?|design goals?|problem statement|objectives?|expected outcomes?|aims?|goals?)/i,
    kw: /\b(hypothes[ie]s|i (predict|expect|hypothesi[sz]e)|we (predict|expect)|research question|engineering goal|my goal is)\b/i,
    minWords: 12,
  },
  {
    id: "materials",
    label: "Materials",
    head: /(materials?( and (equipment|methods))?|equipment|supplies|apparatus|components|bill of materials|software and hardware|hardware|tools)/i,
    kw: /\b(materials?|equipment|i will (use|need)|we will (use|need)|supplies)\b/i,
    minWords: 8,
  },
  {
    id: "procedure",
    label: "Procedure",
    head: /(procedures?|methods?|methodology|experimental design|design process|protocol|experimental procedure|steps)/i,
    kw: /\b(step \d|first,|next,|then,|finally,|procedure|i will (measure|record|test|collect|build|run|mix|add)|we will (measure|record|test|collect|build|run|mix|add))\b/i,
    minWords: 80,
  },
  {
    id: "safety",
    label: "Risk and safety",
    head: /(risks?( and| &|\/)? ?safety|(human participants?|vertebrate animals?|potentially hazardous biological agents?|hazardous chemicals,? activities,? (?:or|and|&) devices)( research)?|safety( and risks?| precautions| plan| and disposal)?|risk assessment|hazards?|risks?|disposal)/i,
    kw: /\b(safety|goggles|gloves|ppe|hazard|risk assessment|dispos(e|al)|first aid)\b/i,
    minWords: 20,
  },
  {
    id: "analysis",
    label: "Data analysis",
    head: /(data analysis|analysis|calculations?|statistic(s|al)( analysis)?|data (collection and )?analysis|analysis plan|how (the )?data)/i,
    kw: /\b(t-?test|anova|chi-?square|regression|correlation|standard deviation|statistical|statistics|compare (the )?(mean|average)s?|will (analy[sz]e|graph|plot))\b/i,
    minWords: 15,
  },
  {
    id: "bibliography",
    label: "Bibliography",
    head: /(bibliography|references?|works cited|literature cited|sources|citations?)/i,
    kw: /(\[\d+\]|\(\s?[A-Z][A-Za-z'’-]+(?: et al\.)?,? (?:19|20)\d{2}[a-z]?\s?\)|\bet al\.|\bdoi:|https?:\/\/)/i,
    minWords: 5,
  },
  {
    id: "ack",
    label: "Acknowledgements and AI use",
    head: /(acknowledg(e)?ments?|ai (use|disclosure|statement|usage)|use of ai|support disclosure)/i,
    kw: /\b(acknowledg(e)?ments?|special thanks|thank (my|the)|i (used|consulted) (chatgpt|claude|gemini|copilot|ai))\b/i,
    minWords: 3,
  },
];

export interface Parsed {
  sections: Record<SectionId, string>;
  info: SectionInfo[];
  /** Everything outside the bibliography. Used for body checks. */
  body: string;
  /** Procedure text if found, otherwise the body. */
  procedureOrBody: string;
  lines: string[];
}

function stripHeading(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/^\s*(\*\*|__)/, "")
    .replace(/(\*\*|__)\s*$/, "")
    .replace(/^\s*(?:\d{1,2}[.)]|[A-Za-z][.)]|[IVX]{1,4}[.)])\s+/, "")
    .replace(/^\s*(?:section\s+\d+\s*[:.-]\s*)/i, "")
    .trim();
}

function matchDefs(candidate: string): SectionId[] {
  const c = candidate.trim();
  // "Materials and Methods" is one heading that covers both sections.
  if (/^(?:the\s+|my\s+|our\s+)?materials?\s*(?:and|&)\s*methods?$/i.test(c)) return ["materials", "procedure"];
  const anchor = (def: SectionDef) =>
    new RegExp("^(?:the\\s+|my\\s+|our\\s+)?" + def.head.source + "(?:\\s*(?:section|plan))?$", "i");
  // Whole-heading match first: "Risk and Safety", "Data analysis".
  const whole = SECTION_DEFS.filter((d) => anchor(d).test(c)).map((d) => d.id);
  if (whole.length > 0) return whole.slice(0, 1);
  // Compound headings: "Research question and hypothesis", "Materials and methods".
  const pieces = c.split(/\s*(?:,|&|\band\b|\/|\bor\b)\s*/i).filter(Boolean);
  if (pieces.length < 2) return [];
  const ids: SectionId[] = [];
  for (const piece of pieces) {
    const hit = SECTION_DEFS.find((d) => anchor(d).test(piece));
    if (!hit) return [];
    if (!ids.includes(hit.id)) ids.push(hit.id);
  }
  return ids;
}

/** Return the section ids if this line is a heading, plus any text that follows on the same line. */
function headingOf(line: string): { ids: SectionId[]; rest: string } | null {
  const raw = line.trim();
  if (!raw) return null;
  const clean = stripHeading(raw).replace(/\*\*/g, "");
  // "Procedure: text on the same line". The text after the colon may be long.
  const inline = clean.match(/^([A-Za-z][A-Za-z &/,-]{2,50}?)\s*:\s+(\S.*)$/) ??
    (raw.length <= 110 ? clean.match(/^([A-Za-z][A-Za-z &/,-]{2,50}?)\s*[\u2013\u2014-]\s+(\S.*)$/) : null);
  if (!inline && raw.length > 110) return null;
  const candidate = inline ? inline[1] : clean.replace(/[:.]\s*$/, "");
  if (words(candidate) > 8) return null;
  const ids = matchDefs(candidate);
  if (ids.length === 0) return null;
  return { ids, rest: inline ? inline[2] : "" };
}

export function parsePlan(plan: string): Parsed {
  const lines = plan.split(/\r?\n/);
  const acc: Record<SectionId, string[]> = {
    rationale: [],
    question: [],
    materials: [],
    procedure: [],
    safety: [],
    analysis: [],
    bibliography: [],
    ack: [],
  };
  const headed = new Set<SectionId>();
  let current: SectionId[] = [];
  const preface: string[] = [];

  for (const line of lines) {
    const h = headingOf(line);
    if (h) {
      current = h.ids;
      for (const id of h.ids) {
        headed.add(id);
        if (h.rest) acc[id].push(h.rest);
      }
      continue;
    }
    if (current.length > 0) for (const id of current) acc[id].push(line);
    else preface.push(line);
  }

  const sections = {} as Record<SectionId, string>;
  for (const def of SECTION_DEFS) sections[def.id] = acc[def.id].join("\n").trim();

  const bibStart = lines.findIndex((l) => headingOf(l)?.ids.includes("bibliography"));
  const bodyLines = bibStart >= 0 ? lines.slice(0, bibStart) : lines;
  const body = bodyLines.join("\n").trim();

  const info: SectionInfo[] = SECTION_DEFS.map((def) => {
    const hasHeading = headed.has(def.id);
    const text = hasHeading ? sections[def.id] : "";
    const keywordOnly = !hasHeading && has(def.kw, plan);
    return {
      id: def.id,
      label: def.label,
      hasHeading,
      keywordOnly,
      words: words(text),
    };
  });

  const procedureText = sections.procedure || body;
  return { sections, info, body, procedureOrBody: procedureText, lines };
}
