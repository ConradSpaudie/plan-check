#!/usr/bin/env node
// Submission gate. Run `npm run preflight`, then `npm run preflight -- --url https://your-site`.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : null;
let failed = 0;
const ok = (m) => console.log(`  pass  ${m}`);
const bad = (m) => {
  failed++;
  console.log(`  FAIL  ${m}`);
};

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|md)$/.test(f)) out.push(p);
  }
  return out;
}

console.log("Plan Check preflight\n");

// README
const readme = existsSync(join(root, "README.md")) ? readFileSync(join(root, "README.md"), "utf8") : "";
readme.length > 400 && !/create-next-app/.test(readme) ? ok("README is written") : bad("README is missing or still the template");
/!\[[^\]]*\]\([^)]+\)/.test(readme) ? ok("README has a screenshot") : bad("README has no screenshot");

// Placeholder text
const placeholder = /(lorem ipsum|TODO|FIXME|To get started, edit|Your Name|example\.com)/;
const hits = ["app", "components", "lib"].flatMap((d) => walk(join(root, d))).filter((f) => placeholder.test(readFileSync(f, "utf8")));
hits.length === 0 ? ok("No placeholder text in app code") : bad(`Placeholder text in: ${hits.map((h) => h.replace(root, "")).join(", ")}`);

// No em dashes in user-facing copy
const dash = ["app", "components"].flatMap((d) => walk(join(root, d))).filter((f) => /—/.test(readFileSync(f, "utf8").replace(/\\u2014/g, "")));
dash.length === 0 ? ok("No em dashes in UI copy") : bad(`Em dashes in: ${dash.map((h) => h.replace(root, "")).join(", ")}`);

// Secrets
const secret = /(sk-[A-Za-z0-9]{20,}|AI_GATEWAY_API_KEY\s*=\s*\S{10,})/;
const leaks = ["app", "components", "lib"].flatMap((d) => walk(join(root, d))).filter((f) => secret.test(readFileSync(f, "utf8")));
leaks.length === 0 ? ok("No secrets in source") : bad(`Possible secret in: ${leaks.join(", ")}`);

// Typecheck and tests
for (const [name, cmd] of [
  ["Typecheck", "npm run typecheck"],
  ["Lint", "npx eslint ."],
  ["Tests", "npx vitest run"],
]) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe" });
    ok(name);
  } catch (e) {
    bad(`${name}\n${String(e.stdout ?? "").slice(-1500)}`);
  }
}

// Live site
if (url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    res.ok ? ok(`${url} returns ${res.status}`) : bad(`${url} returns ${res.status}`);
    /Catch what the SRC will send back/.test(html) ? ok("Live page shows the headline") : bad("Live page is missing the headline");
    const api = await fetch(new URL("/api/review", url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: "short" }),
    });
    api.status === 400
      ? ok("AI route validates input (400 on a short plan)")
      : api.status === 404
        ? ok("AI route is switched off (404), as expected while NEXT_PUBLIC_AI_REVIEW is not set")
        : bad(`AI route returned ${api.status} for a short plan`);
  } catch (e) {
    bad(`Could not reach ${url}: ${e.message}`);
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
