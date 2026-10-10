import type { Finding, Severity } from "./engine/types";

export interface Segment {
  text: string;
  /** Index into the findings array, if this stretch of the plan is marked. */
  finding?: number;
  severity?: Severity;
}

const RANK: Record<Severity, number> = { fix: 0, warn: 1, verify: 2 };

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find the evidence text in the plan, tolerant of whitespace differences and a trailing ellipsis. */
export function locate(plan: string, evidence: string): [number, number] | null {
  const ev = evidence.replace(/…$/, "").trim();
  if (ev.length < 8) return null;
  const tokens = ev.split(/\s+/).map(escapeRe);
  const m = new RegExp(tokens.join("\\s+"), "i").exec(plan);
  if (!m) return null;
  return [m.index, m.index + m[0].length];
}

/**
 * Turn a plan and its findings into non-overlapping marked segments.
 * Where marks collide, the more serious one wins.
 */
export function annotate(plan: string, findings: Finding[]): Segment[] {
  interface Range {
    start: number;
    end: number;
    finding: number;
    severity: Severity;
  }
  const ranges: Range[] = [];
  findings.forEach((f, i) => {
    for (const ev of f.evidence ?? []) {
      const r = locate(plan, ev);
      if (r) ranges.push({ start: r[0], end: r[1], finding: i, severity: f.severity });
    }
  });

  ranges.sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.start - b.start);
  const accepted: Range[] = [];
  for (const r of ranges) {
    if (accepted.some((a) => r.start < a.end && a.start < r.end)) continue;
    accepted.push(r);
  }
  accepted.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  for (const r of accepted) {
    if (r.start > cursor) out.push({ text: plan.slice(cursor, r.start) });
    out.push({ text: plan.slice(r.start, r.end), finding: r.finding, severity: r.severity });
    cursor = r.end;
  }
  if (cursor < plan.length) out.push({ text: plan.slice(cursor) });
  return out;
}
