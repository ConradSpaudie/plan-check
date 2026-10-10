/** Small text helpers shared by the checks. Nothing here rewrites student text. */

export function words(s: string): number {
  const m = s.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g);
  return m ? m.length : 0;
}

/** Split into sentences. Keeps fragments that look like sentences, drops one-word noise. */
export function sentences(s: string): string[] {
  const out: string[] = [];
  for (const block of s.split(/\n+/)) {
    const line = block.trim();
    if (!line) continue;
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/);
    for (const p of parts) {
      const t = p.trim();
      if (words(t) >= 3) out.push(t);
    }
  }
  return out;
}

export function clip(s: string, max = 220): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function has(re: RegExp, s: string): boolean {
  // Avoid shared lastIndex state on global regexes.
  return new RegExp(re.source, re.flags.replace("g", "")).test(s);
}

export function matchAll(re: RegExp, s: string): RegExpMatchArray[] {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return Array.from(s.matchAll(new RegExp(re.source, flags)));
}
