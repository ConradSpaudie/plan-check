/**
 * Turns the positioned text runs pdf.js gives us back into plain paragraphs.
 * A PDF stores every visual line separately, so wrapped lines are rejoined into paragraphs,
 * while headings, numbered steps and bibliography entries keep their own lines.
 * Pure function: no pdf.js import, so it can be tested in Node.
 */

export interface TextRun {
  str: string;
  /** pdf.js transform: [a, b, c, d, x, y]. y grows upward. */
  transform: number[];
  width?: number;
  height: number;
  hasEOL?: boolean;
}

interface Line {
  text: string;
  y: number;
  x0: number;
  x1: number;
  h: number;
}

/** Group runs into visual lines by their baseline. */
function toLines(runs: TextRun[]): Line[] {
  const lines: Line[] = [];
  let cur: Line | null = null;
  for (const r of runs) {
    const x = r.transform[4];
    const y = r.transform[5];
    const h = r.height || Math.abs(r.transform[3]) || 10;
    const w = r.width ?? r.str.length * h * 0.5;
    if (!cur || Math.abs(y - cur.y) > Math.max(2, h * 0.5)) {
      if (cur) lines.push(cur);
      cur = { text: "", y, x0: x, x1: x, h };
    }
    if (cur.text && r.str && !cur.text.endsWith(" ") && !r.str.startsWith(" ") && x - cur.x1 > h * 0.15) cur.text += " ";
    cur.text += r.str;
    if (r.str.trim()) {
      cur.x0 = Math.min(cur.x0, x);
      cur.x1 = Math.max(cur.x1, x + w);
    }
    cur.h = Math.max(cur.h, h);
    if (r.hasEOL) {
      lines.push(cur);
      cur = null;
    }
  }
  if (cur) lines.push(cur);
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/[ \t]+/g, " ").trim() }))
    .filter((l) => l.text.length > 0);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** A line that starts its own item: a numbered step, a bullet, or a numbered reference. */
const ITEM_START = /^(\d{1,2}[.)]\s|\(\d{1,2}\)\s|\[\d{1,3}\]|[•▪●◦\-–]\s|[A-Za-z][.)]\s)/;

/** Page numbers and "Page 3 of 8" in a header or footer are not part of the plan. */
const PAGE_NUMBER = /^(page\s*)?\d{1,3}(\s*(of|\/)\s*\d{1,3})?$/i;

function dropPageNumbers(lines: Line[]): Line[] {
  return lines.filter((l, i) => !((i === 0 || i === lines.length - 1) && PAGE_NUMBER.test(l.text)));
}

function pageParagraphs(lines: Line[]): { paras: { text: string; gapAbove: number }[]; endsWrapped: boolean } {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    if (g > 0) gaps.push(g);
  }
  const lineGap = median(gaps) || 14;
  const right = Math.max(...lines.map((l) => l.x1));
  const left = Math.min(...lines.map((l) => l.x0));
  const width = Math.max(1, right - left);

  const paras: { text: string; gapAbove: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const prev = lines[i - 1];
    const gap = prev ? prev.y - l.y : 0;
    const close = prev && gap > 0 && gap <= lineGap * 1.3 && Math.abs(l.h - prev.h) < Math.max(1, prev.h * 0.2);
    // A link pushed onto its own line belongs to the line above, even though that line ended early.
    const urlOnly = /^(https?:\/\/|www\.|doi:)\S+$/i.test(l.text);
    const prevToken = prev ? prev.text.split(" ").pop() ?? "" : "";
    const prevEndsInLink = /^(https?:\/\/|www\.|doi:)/i.test(prevToken);
    // A link that breaks at a hyphen continues on the next line ("Final_WWC-" + "Handbook.pdf").
    const linkContinues = prevEndsInLink && /-$/.test(prevToken) && !/\s/.test(l.text.split(" ")[0]);
    // After a reference that ends in a link, a line starting with an author ("Kestin, G.") is the next reference.
    const nextReference = prevEndsInLink && !linkContinues && /^[A-Z][\w'’.-]*(,|\s\(|\.\s)/.test(l.text);
    const continues =
      close &&
      !ITEM_START.test(l.text) &&
      !nextReference &&
      // The previous line ran to (nearly) the right margin, so this line is a wrap of it.
      (prev.x1 >= right - width * 0.15 || urlOnly || linkContinues);
    if (continues && paras.length) {
      const last = paras[paras.length - 1];
      const lastToken = last.text.split(" ").pop() ?? "";
      // Word does not hyphenate by default, so a hyphen at the end of a line is a real one ("in-class"): keep it, no space.
      // A link broken across lines also continues without a space.
      if (/-$/.test(last.text) || (/^(https?:\/\/|www\.)/i.test(lastToken) && /^[\w\/.%#?=&~-]/.test(l.text))) {
        last.text += l.text;
      } else {
        last.text += " " + l.text;
      }
    } else {
      paras.push({ text: l.text, gapAbove: prev ? gap / lineGap : 0 });
    }
  }
  const lastLine = lines[lines.length - 1];
  return { paras, endsWrapped: lastLine.x1 >= right - width * 0.15 };
}

/** After a reference that ends in a link, a line starting with an author ("Kestin, G.") is the next reference. */
function startsNextReference(before: string, line: string): boolean {
  const token = before.split(" ").pop() ?? "";
  return /^(https?:\/\/|www\.|doi:)/i.test(token) && !/-$/.test(token) && /^[A-Z][\w'’.-]*(,|\s\(|\.\s)/.test(line);
}

export function linesFromRuns(pages: TextRun[][]): string {
  const out: string[] = [];
  let prevEndsWrapped = false;
  for (const runs of pages) {
    const lines = dropPageNumbers(toLines(runs));
    if (lines.length === 0) continue;
    const { paras, endsWrapped } = pageParagraphs(lines);
    paras.forEach((p, i) => {
      const last = out[out.length - 1];
      // A paragraph that runs over a page break: the last page ended mid-sentence at the margin.
      const carriesOver =
        i === 0 &&
        last !== undefined &&
        prevEndsWrapped &&
        !ITEM_START.test(p.text) &&
        !startsNextReference(last, p.text) &&
        (!/[.?!:"”)\]]$/.test(last) || /^[a-z(]/.test(p.text) || /^(https?:\/\/|www\.|doi:)/i.test(p.text));
      if (carriesOver) out[out.length - 1] = /-$/.test(last) ? last + p.text : last + " " + p.text;
      else out.push(p.text);
    });
    prevEndsWrapped = endsWrapped;
  }
  return out.join("\n").trim();
}
