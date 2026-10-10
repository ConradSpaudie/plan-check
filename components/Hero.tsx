import { SeverityTag } from "@/components/SeverityTag";

/** A static specimen: three lines of a weak plan with a reviewer's marks and margin notes. */
export function Hero() {
  return (
    <header className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14">
      <p className="font-display text-lg font-bold">Plan Check</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div>
          <h1 className="max-w-[14ch] font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-[3.6rem]">
            Catch what the SRC will send back.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg">
            Upload or paste your ISEF research plan and enter your form dates. Plan Check marks it up the way a reviewer would, before you submit.
          </p>
          <p className="mt-3 max-w-[46ch] text-pencil">
            Free. No account. PDF, Word or pasted text, and your plan stays in your browser. Checked against the 2026-27 ISEF rules and forms.
          </p>
          <a href="#check" className="btn btn-solid mt-6 no-underline">
            Check my plan
          </a>
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
            Red pen means fix it. Highlighter means check it. Pencil means verify it with your fair.
          </figcaption>
        </figure>
      </div>
    </header>
  );
}
