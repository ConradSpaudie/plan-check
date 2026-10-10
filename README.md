# Plan Check

A free pre-reviewer for ISEF research plans. Paste your plan, say what your project involves, enter the dates on your signed forms, and Plan Check marks up your plan the way a Scientific Review Committee (SRC) reviewer would, before you submit.

![Plan Check marking up a research plan: red pen for fixes, highlighter for things to check, pencil for things to verify](docs/screenshot.png)

## Why

Getting an ISEF project approved means a research plan plus a stack of forms (1, 1A, 1B, 2A, 3, 4, 5A, 6A and more), each signed and dated in the right order before you start. Plans come back for the same reasons every year: forms dated after the start date, a missing risk and safety section, "standard procedure" with no detail, bare links in the bibliography, a survey of classmates with no IRB review. The 2026-27 forms also renumbered (Form 1C is now 2C, Form 2 is now 2B), so old guides are wrong. I built this after going through it myself.

## What it checks

- **Dates and approvals (exact checks).** Every form that must be signed before experimentation is compared with your Form 1A start date. Forms completed after (2C, 5B, 7, final SRC review) are checked the other way. Fair deadlines and the 12-month project window are checked too.
- **Forms you need.** From what your project involves (people, vertebrate animals, biological agents, hazards, an outside lab, a continuation, AI use), with the 2026-27 numbers and the order to sign them.
- **The plan itself (pattern checks).** Required sections, procedure detail (quantities, trials, controls, who does what), vague wording, safety coverage of the hazards you mention, a named analysis method, bibliography format and in-text citations, old form numbers, human-participant and biological-agent details, AI-use disclosure.
- Every finding quotes the exact sentence from your plan, says why a reviewer cares, links the official source, and asks a question instead of rewriting your text.

Three severities, drawn the way a reviewer marks paper: **Fix** (red pen), **Check** (highlighter), **Verify** (pencil: a rule I could not confirm from an official source, so ask your fair).

## Privacy

The rule engine runs entirely in your browser. Your plan is not uploaded or stored.

The optional AI review is the only thing that sends your plan anywhere (to Claude through the Vercel AI Gateway). It is off until you tick a consent box. It only asks questions tied to exact sentences in your plan and never writes or rewrites text, because ISEF does not allow generative AI to write the plan. It produces an AI-use log you can copy for Form 2A. ISEF allows AI feedback on your own finished draft when you disclose it, but some fairs and teachers are stricter, so ask yours first.

## Honest limits

- Plan Check is a pre-check. It cannot approve anything. Only your fair's SRC or IRB can.
- Pattern checks are heuristics. They will sometimes flag something that is fine, or miss something. Each one says it is a pattern check.
- Rules were last checked in October 2026 against the ISEF 2026-27 International Rules and the 2027 forms. Anything not confirmed from an official source is marked Verify.
- The two samples in the app are invented. The engine is also tested against seven real, publicly posted sample plans in `fixtures/real/` (sources in `fixtures/real/SOURCES.md`) to find false positives.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 52 tests: dates, sections, bibliography, detection, real plans
npm run preflight  # typecheck, lint, tests, README and placeholder checks
npm run preflight -- --url https://your-deployment.vercel.app
```

The AI review needs the Vercel AI Gateway. On Vercel it authenticates automatically. Locally, set `AI_GATEWAY_API_KEY`. Set `DEMO_MODE=1` to return a canned review with no model call.

## How it is built

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, AI SDK 7 with zod structured output. The rule engine is plain TypeScript in `lib/engine/` with no dependencies, so it can run anywhere. Components are hand-built rather than from a UI kit.

Built by Conrad Spaudie with help from Claude (Anthropic) for research, code and testing.
