# Releasing Plan Check

Every push to `main` deploys to https://isef-plan-check.vercel.app. This page is the release bar, how problems are caught, and how to undo a bad release.

## Release bar

A release is ready when all of these are true:

- No open P0 (blocker) or P1 (should-fix) bugs.
- CI is green on the commit: typecheck, lint, unit tests, build, and the end-to-end suite on desktop and phone sizes, including accessibility scans.
- The owner has walked through the core flow by hand on a real phone and a laptop (checklist below) and signed off.
- Accuracy limits are shown on the site (report header, "Doesn't apply", footer).

## How problems are caught

| Signal | What it catches | Where you see it |
| --- | --- | --- |
| CI (`.github/workflows/ci.yml`) | A change that breaks a test, before or right after it ships | Red X on the commit, email from GitHub |
| Live site check (`.github/workflows/live-check.yml`) | The deployed site breaking, after every production deploy and every morning at 7:17 am Pacific | A new GitHub issue titled "Live site check failed", emailed to you |
| Automatic error reports (`/api/client-error`) | Errors in students' browsers that the page did not catch, and unexpected file-reading failures | Vercel, project isef-plan-check, Logs, search `[client-error]` |
| "Report a problem" links | Anything a student or teacher notices | Email to cspaudie@gmail.com |

Error reports never contain the plan text, file names or dates: only the error message, page, version and browser.

## Roll back a bad release

1. Open Vercel, project **isef-plan-check**, **Deployments**.
2. Find the previous production deployment (on the Hobby plan only the one right before the current one can be restored).
3. Open its menu and choose **Instant Rollback**. The site switches back within seconds; nothing is rebuilt.
4. Fix the problem and push. If the new deployment does not go live by itself, open it in Deployments and choose **Promote**.

From a terminal with the Vercel CLI: `vercel rollback`.

Rollback log:

| Date | What | Result |
| --- | --- | --- |
| | Practice rollback to the previous deploy, then Promote back | Not yet done |

## Owner walk-through (about 10 minutes)

Do this on your phone and on your laptop after a release that changes what students see.

1. Open the site. The upload box is on the first screen.
2. Upload your own plan as a PDF. You land on Confirm with "Read N words".
3. Check the ticks and the start date. Change one tick and watch "Your report so far" change.
4. See my report. On the laptop click a mark; on the phone open Plan and tap a mark.
5. Mark one finding "Doesn't apply", then restore it.
6. Reload the page and use "Pick up where you left off".
7. Clear my data.

## Sign-off record

| Release (commit) | Date | Owner walk-through | Independent review | Notes |
| --- | --- | --- | --- | --- |
| 8900f06 + monitoring | | Not yet | Claude code review (not independent of the builder) | |

Ask one science teacher or SRC member to run a real plan through the site and say which findings were wrong or missing. Record who and what they found here.
