import { SRC } from "@/lib/engine/sources";

export function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-sheet">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="max-w-prose space-y-3">
          <p className="font-bold">Plan Check is a pre-check, not an approval.</p>
          <p className="text-pencil">
            Only your fair&apos;s Scientific Review Committee or IRB can approve your project. Pattern checks can be wrong. Anything marked Verify is a rule we could not confirm from an official source, so ask your fair.
          </p>
          <p className="text-pencil">
            Rules last checked in October 2026 against the ISEF 2026-27 International Rules and the 2027 forms.
          </p>
          <p className="text-pencil">Built by Conrad Spaudie, a student who went through this.</p>
        </div>
        <div>
          <p className="font-bold">Official sources</p>
          <ul className="mt-2 list-none space-y-1 p-0">
            <li>
              <a className="tap-link underline" href={SRC.rulesAll.url} target="_blank" rel="noreferrer noopener">
                ISEF International Rules
              </a>
            </li>
            <li>
              <a className="tap-link underline" href={SRC.formsPage.url} target="_blank" rel="noreferrer noopener">
                ISEF forms
              </a>
            </li>
            <li>
              <a className="tap-link underline" href={SRC.commonProblems.url} target="_blank" rel="noreferrer noopener">
                Common problems the SRC finds
              </a>
            </li>
            <li>
              <a className="tap-link underline" href={SRC.aiTable.url} target="_blank" rel="noreferrer noopener">
                ISEF rules on AI use
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
