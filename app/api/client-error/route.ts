import { z } from "zod";

/**
 * Receives automatic error reports from the browser and writes them to the Vercel runtime logs,
 * where the owner can search for "[client-error]". Reports carry no plan text.
 */

const Report = z.object({
  kind: z.enum(["window-error", "unhandled-rejection", "render-error", "file-read"]),
  message: z.string().max(300),
  stack: z.string().max(1200).optional(),
  path: z.string().max(200),
  version: z.string().max(40),
  ua: z.string().max(200),
  extra: z.record(z.string(), z.union([z.string().max(100), z.number()])).optional(),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return new Response(null, { status: 429 });
  let parsed;
  try {
    const text = await req.text();
    if (text.length > 4000) return new Response(null, { status: 413 });
    parsed = Report.safeParse(JSON.parse(text));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  console.error("[client-error]", JSON.stringify(parsed.data));
  return new Response(null, { status: 204 });
}
