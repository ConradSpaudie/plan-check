import { describe, expect, it } from "vitest";
import { linesFromRuns, type TextRun } from "./extract-lines";

// A PDF stores every visual line separately. These runs mimic what pdf.js returns for a Word export.
describe("reading uploaded PDFs", () => {
  it("keeps real hyphens at line ends and joins links broken across lines", () => {
    const line = (str: string, y: number, x1: number): TextRun => ({ str, transform: [12, 0, 0, 12, 72, y], width: x1 - 72, height: 12 });
    const text = linesFromRuns([
      [
        line("AI tutoring outperforms in-", 700, 540),
        line("class active learning. https://ies.ed.gov/Final_WWC-", 686, 540),
        line("Handbook.pdf", 672, 160),
        line("Kestin, G. (2025). Next reference.", 658, 300),
      ],
    ]);
    expect(text).toBe("AI tutoring outperforms in-class active learning. https://ies.ed.gov/Final_WWC-Handbook.pdf\nKestin, G. (2025). Next reference.");
  });

  it("drops page numbers and joins a paragraph that runs over a page break", () => {
    const line = (str: string, y: number, x1: number): TextRun => ({ str, transform: [12, 0, 0, 12, 72, y], width: x1 - 72, height: 12 });
    const text = linesFromRuns([
      [line("Procedure", 720, 150), line("We will collect data at the school for twelve weeks and score every", 700, 540), line("3", 40, 80)],
      [line("4", 760, 80), line("probe blind to phase.", 720, 250)],
    ]);
    expect(text).toBe("Procedure\nWe will collect data at the school for twelve weeks and score every probe blind to phase.");
  });
});
