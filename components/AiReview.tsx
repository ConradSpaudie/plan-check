"use client";

import { useState } from "react";

interface Q {
  quote: string;
  question: string;
  area: string;
}

interface LogEntry {
  date: string;
  model: string;
}

const PURPOSE =
  "Asked an AI reviewer for questions about my finished research plan draft. It did not write or rewrite any text. I made all changes myself.";

export function AiReview({ plan }: { plan: string }) {
  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [overall, setOverall] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  async function run() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The AI review failed.");
        setState("error");
        return;
      }
      setQuestions(data.questions ?? []);
      setOverall(data.overall ?? "");
      setLog((l) => [...l, { date: new Date().toLocaleDateString("en-CA"), model: data.model ?? "AI model" }]);
      setState("done");
    } catch {
      setError("Could not reach the AI review. Check your connection. Your rule checks are unaffected.");
      setState("error");
    }
  }

  const logText = log
    .map((e) => `${e.date}\tTool: Plan Check AI review (${e.model})\tPurpose: ${PURPOSE}`)
    .join("\n");

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="ai-title" className="border-t-2 border-ink pt-6">
      <h2 id="ai-title" className="font-display text-2xl font-bold">
        Optional: ask an AI reviewer
      </h2>
      <p className="mt-2 max-w-prose">
        An AI reads your plan and asks the questions a reviewer might. It never writes or rewrites your text.
      </p>
      <ul className="mt-3 max-w-prose list-disc space-y-1 pl-5 text-pencil">
        <li>This sends your plan to an AI model through Vercel. The rule checks above never leave your browser.</li>
        <li>
          ISEF lets you get AI feedback on your own finished draft, but you must say so on Form 2A and keep a log. Some fairs and teachers are stricter. Ask yours first.
        </li>
      </ul>

      <label className="mt-4 flex max-w-prose items-start gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 shrink-0 accent-[var(--ink)]"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>I understand this sends my plan to an AI model and that I need to disclose it.</span>
      </label>

      <div className="mt-4">
        <button
          type="button"
          className="btn btn-solid"
          disabled={!agreed || state === "loading" || plan.trim().length < 200}
          onClick={run}
        >
          {state === "loading" ? "Asking the AI reviewer" : "Ask the AI reviewer"}
        </button>
        {plan.trim().length < 200 ? (
          <p className="mt-2 text-sm text-pencil">Paste a full plan first. The AI review needs at least 200 characters.</p>
        ) : null}
      </div>

      <div aria-live="polite">
        {state === "error" ? (
          <p className="mt-4 max-w-prose border-l-4 border-red-pen pl-3 font-bold text-red-pen">{error}</p>
        ) : null}

        {state === "done" ? (
          <div className="mt-6">
            {overall ? <p className="max-w-prose font-bold">{overall}</p> : null}
            {questions.length === 0 ? (
              <p className="mt-3 text-pencil">The AI reviewer had no questions it could tie to an exact sentence in your plan.</p>
            ) : (
              <ol className="mt-4 list-decimal space-y-4 pl-6">
                {questions.map((q, i) => (
                  <li key={i} className="pl-1">
                    <p className="border-l-4 border-rule pl-3 italic">{q.quote}</p>
                    <p className="mt-1">{q.question}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>

      {log.length > 0 ? (
        <div className="mt-8 border-t border-rule pt-4">
          <h3 className="font-display text-xl font-bold">Your AI-use log</h3>
          <p className="mt-1 max-w-prose text-sm text-pencil">
            Keep this for Form 2A and your project notebook. It only lives in this tab, so copy it now.
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border border-rule bg-paper p-3 text-sm">{logText}</pre>
          <button type="button" className="btn mt-3" onClick={copyLog}>
            {copied ? "Copied" : "Copy AI-use log"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
