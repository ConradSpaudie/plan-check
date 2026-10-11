"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report";

/** Reports errors the page did not catch, so a broken release shows up in the logs without waiting for an email. */
export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const onError = (e: ErrorEvent) => {
      if (sent++ < 5) reportError("window-error", e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (sent++ < 5) reportError("unhandled-rejection", e.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
