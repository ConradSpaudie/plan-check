"use client";

import { linesFromRuns, type TextRun } from "./extract-lines";

/**
 * Reads a research plan file in the browser. Nothing is uploaded: the file never leaves
 * the student's computer. PDF uses pdf.js, Word uses mammoth, text files are read directly.
 */

export const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const MAX_BYTES = 15 * 1024 * 1024;

export class ExtractError extends Error {}

async function readPdf(file: File): Promise<string> {
  // The legacy build includes the polyfills that older Safari, Chrome and school Chromebooks need.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // The worker is copied into /public at build time (scripts/copy-pdf-worker.mjs).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.legacy.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/password/i.test(msg)) throw new ExtractError("This PDF is password protected. Remove the password, or paste the text instead.");
    throw new ExtractError("This PDF could not be opened. Try exporting it again, or paste the text instead.");
  }
  const pages: TextRun[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const runs: TextRun[] = [];
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const t = it as { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean };
      runs.push({ str: t.str, transform: t.transform, width: t.width, height: t.height, hasEOL: t.hasEOL });
    }
    pages.push(runs);
  }
  await doc.cleanup?.();
  const text = linesFromRuns(pages);
  if (text.replace(/\s/g, "").length < 50) {
    throw new ExtractError("This PDF has almost no text, so it is probably a scan or a photo. Export the plan from Word or Google Docs as a PDF, or paste the text instead.");
  }
  return text;
}

async function readDocx(file: File): Promise<string> {
  // mammoth's browser build has no types; it exposes extractRawText.
  const mod = (await import("mammoth/mammoth.browser.js")) as unknown as {
    default?: { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    extractRawText?: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const mammoth = mod.default ?? mod;
  try {
    const { value } = await mammoth.extractRawText!({ arrayBuffer: await file.arrayBuffer() });
    return value.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new ExtractError("This Word file could not be read. Save it again as .docx, or paste the text instead.");
  }
}

export async function extractPlanText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new ExtractError("That file is over 15 MB. A research plan should be much smaller. Try exporting it again without images.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(file);
  if (name.endsWith(".docx")) return readDocx(file);
  if (name.endsWith(".doc")) throw new ExtractError("Old .doc files are not supported. Save it as .docx or PDF first.");
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) return (await file.text()).trim();
  throw new ExtractError("Plan Check reads PDF, Word (.docx) and text files. For Google Docs, use File, then Download, then PDF.");
}
