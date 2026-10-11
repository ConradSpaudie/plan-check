"use client";

import { useEffect } from "react";
import { reportError, reportLink } from "@/lib/report";

/** Shown when the page itself fails. Says what happened and how to get going again. */
export function BrokenPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError("render-error", error, error.digest ? { digest: error.digest } : undefined);
  }, [error]);

  return (
    <main className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6">
      <p className="font-display text-lg font-bold">Plan Check</p>
      <h1 className="mt-6 font-display text-[2rem] font-extrabold leading-tight">Plan Check hit an error.</h1>
      <p className="mt-3 max-w-prose">
        The error was reported automatically, without your plan. Your plan and dates are still saved in this browser, so reloading usually gets you back where you were.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn btn-solid" onClick={() => retry()}>
          Try again
        </button>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
      <p className="mt-6 max-w-prose text-pencil">
        Still broken?{" "}
        <a className="tap-link font-bold text-ink underline" href={reportLink(`The page showed "Plan Check hit an error". ${error.message.slice(0, 120)}`)}>
          Email the developer
        </a>{" "}
        and say what you were doing.
      </p>
    </main>
  );
}
