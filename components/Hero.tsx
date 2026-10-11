"use client";

import { useState } from "react";
import { SeverityTag } from "@/components/SeverityTag";
import { ACCEPT } from "@/lib/extract";

interface Props {
  onFile: (file: File | undefined) => void;
  onPaste: () => void;
  onSample: () => void;
  /** A plan saved in this browser from an earlier visit. */
  saved: boolean;
  onResume: () => void;
  busy: boolean;
  /** A file that could not be read. */
  error: string;
}

/** The first screen: what Plan Check does, the specimen that shows it, and the upload box. */
export function Hero({ onFile, onPaste, onSample, saved, onResume, busy, error }: Props) {
  const [dragging, setDragging] = useState(false);

  return (
    <header className="no-print mx-auto w-full max-w-[1200px] px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
      <p className="font-display text-lg font-bold">Plan Check</p>

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <h1 className="max-w-[14ch] font-display text-[2.4rem] font-extrabold leading-[1.02] sm:text-[3.4rem]">
            Catch what the SRC will send back.
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg">
            Upload your ISEF research plan. Plan Check marks it up the way a reviewer would and lists the forms you need, before you submit.
          </p>
          <p className="mt-2 max-w-[46ch] text-pencil">Free. No account. Checked against the 2026-27 ISEF rules and forms.</p>

          {saved ? (
            <div className="no-print mt-5 flex max-w-[34rem] flex-wrap items-center gap-x-4 gap-y-2 border-l-4 border-ink pl-3">
              <p className="m-0">Your last plan is saved in this browser.</p>
              <button type="button" className="btn btn-sm" onClick={onResume}>
                Pick up where you left off
              </button>
            </div>
          ) : null}

          <div
            className={`no-print mt-5 max-w-[34rem] border-2 border-dashed px-5 py-5 ${
              dragging ? "border-[var(--focus)] bg-sheet" : "border-ink"
            }`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDragging(true);
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              if (e.dataTransfer.files.length > 0) {
                e.preventDefault();
                setDragging(false);
                onFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              id="hero-file"
              type="file"
              accept={ACCEPT}
              className="visually-hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label htmlFor="hero-file" className={`btn btn-solid cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
                {busy ? "Reading your file" : "Upload your plan"}
              </label>
              <span className="hidden text-pencil sm:inline">or drop the file here</span>
            </div>
            <p className="mt-3 text-sm text-pencil">
              PDF, Word or text file. It is read on your computer and is never uploaded.
            </p>
            <p className="mt-2 text-sm font-bold text-red-pen empty:hidden" role="status" aria-live="polite">
              {error}
            </p>
          </div>
          <div className="no-print mt-2 flex flex-wrap gap-x-6">
            <button type="button" className="link-btn" onClick={onPaste}>
              Paste the text instead
            </button>
            <button type="button" className="link-btn" onClick={onSample}>
              Try a sample plan
            </button>
          </div>
        </div>

        <figure className="m-0" aria-label="Example of a marked-up plan">
          <div className="sheet relative px-5 py-5 sm:px-6">
            <p className="text-sm font-bold text-pencil">Procedure</p>
            <ol className="mt-2 list-none space-y-5 p-0 text-[1.0625rem] leading-[1.8]">
              <li className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11.5rem] sm:gap-5">
                <p>
                  <span className="mk mk-fix">Several students from my school will be recruited as participants.</span>
                </p>
                <p className="settle border-l-2 border-red-pen pl-3 text-[0.95rem] leading-snug" style={{ animationDelay: "0.15s" }}>
                  <SeverityTag severity="fix" />
                  <span className="mt-1 block">People take part, so you need IRB review and Form 4 before you start.</span>
                </p>
              </li>
              <li className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11.5rem] sm:gap-5">
                <p>
                  <span className="mk mk-warn">Standard procedure will be used for the test.</span>
                </p>
                <p className="settle border-l-2 border-ink pl-3 text-[0.95rem] leading-snug" style={{ animationDelay: "0.45s" }}>
                  <SeverityTag severity="warn" />
                  <span className="mt-1 block">Which procedure? A reviewer needs steps someone else could repeat.</span>
                </p>
              </li>
              <li className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11.5rem] sm:gap-5">
                <p>
                  My teacher will sign Form 2 and <span className="mk mk-verify">Form 1C</span>.
                </p>
                <p className="settle border-l-2 border-pencil pl-3 text-[0.95rem] leading-snug" style={{ animationDelay: "0.75s" }}>
                  <SeverityTag severity="verify" />
                  <span className="mt-1 block">For 2026-27, Form 1C is now 2C and Form 2 is now 2B.</span>
                </p>
              </li>
            </ol>
          </div>
          <figcaption className="mt-3 text-sm text-pencil">
            Red pen means fix it. Highlighter means review it. Pencil means verify it with your fair.
          </figcaption>
        </figure>
      </div>
    </header>
  );
}
