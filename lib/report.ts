/**
 * How problems reach the owner: a "Report a problem" email link people can use,
 * and an automatic error report the browser sends when the page itself breaks.
 * The automatic report never includes the plan text, file names or dates.
 */

export const REPORT_EMAIL = "cspaudie@gmail.com";

/** The build this page came from, so a report says which version broke. */
export const VERSION = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

export function reportLink(what?: string): string {
  const body = [
    "What happened:",
    what ? what : "",
    "",
    "What you expected:",
    "",
    "Device and browser (for example iPhone Safari, Chromebook Chrome):",
    "",
    `Plan Check version: ${VERSION}`,
    "",
    "Please do not paste your whole plan unless you are happy to share it.",
  ].join("\n");
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("Plan Check problem")}&body=${encodeURIComponent(body)}`;
}

export type ErrorKind = "window-error" | "unhandled-rejection" | "render-error" | "file-read";

/** Sends a small error report to /api/client-error. Fire and forget; never throws. */
export function reportError(kind: ErrorKind, error: unknown, extra?: Record<string, string | number>): void {
  try {
    if (typeof window === "undefined") return;
    const e = error instanceof Error ? error : new Error(String(error));
    const payload = JSON.stringify({
      kind,
      message: (e.message || "Unknown error").slice(0, 300),
      stack: (e.stack ?? "").split("\n").slice(0, 6).join("\n").slice(0, 1200),
      path: window.location.pathname,
      version: VERSION,
      ua: navigator.userAgent.slice(0, 200),
      extra: extra ?? {},
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/client-error", blob)) {
      void fetch("/api/client-error", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reporting must never break the page.
  }
}
