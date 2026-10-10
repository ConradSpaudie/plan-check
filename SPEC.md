# Plan Check

A free, private pre-review for ISEF research plans and form dates. It tells a student what an SRC reviewer is likely to send back before they submit.

Built because the research plan and IRB/SRC submission cost weeks of revision cycles, and no tool checks the plan itself or the dates across forms.

## Golden path (this is the whole product)

1. Student pastes their research plan (or loads the sample).
2. Plan Check reads it in the browser, ticks what the project involves (humans, vertebrate animals, hazardous biological agents, hazardous chemicals or devices, outside lab, continuation) and the student confirms.
3. Student enters the planned experiment start date and the date on each signed form.
4. Student sees one report: "Fix first" (top 3), forms needed with 2026-27 numbering, date and signature order checks, then plan section checks. Every flag has the rule, why an SRC cares, the exact sentence, and a source link.
5. Optional, opt-in: AI review that quotes weak sentences and asks questions. It never writes plan text. Using it is logged so the student can disclose it on Form 2A.

## Rules of the tool

- Rule engine first. Dates, form numbering, form triggers, and section checks run in the browser. The plan never leaves the device unless the student clicks AI review.
- Flag and point. The tool never rewrites or generates plan text (ISEF AI Use Table).
- Say "verify" when rules conflict or could not be read from the primary source. Never fail a student on an unconfirmed rule.
- No claim of approval. Plan Check does not replace the SRC.

## Cut from v1

- Accounts, saved projects, uploads of PDFs and DOCX (paste only).
- Fair-specific deadlines database (student enters their fair's date).
- Reading the signed forms themselves (student types dates).

## Clock (about 5 hours, 2:30pm to 7:45pm Pacific)

- 0:00 to 0:30 scope, scaffold, spec.
- 0:30 to 2:00 rule engine plus tests.
- 2:00 to 3:30 UI end to end.
- 3:30 to 4:15 AI review route, polish, empty and error states.
- 4:15 to 4:45 preflight, deploy, phone test.
- 4:45 to 5:15 buffer, demo clip, post.

## Sources of truth

Research report: `/home/claude/reports/ISEF student pain points.md`. Rubric IDs in code (A1, B3, ...) match that report.
