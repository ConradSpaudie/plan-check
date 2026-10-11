import type { ReactNode } from "react";
import type { Severity } from "@/lib/engine/types";

const LABEL: Record<Severity, string> = { fix: "Fix", warn: "Review", verify: "Verify" };

const STYLE: Record<Severity, string> = {
  // Each tag borrows the look of its mark in the plan, so the report doubles as a legend.
  fix: "underline decoration-wavy decoration-2 underline-offset-[5px] decoration-red-pen text-red-pen",
  warn: "bg-hi px-1 text-[#14203a] dark:text-ink",
  verify: "underline decoration-dashed decoration-2 underline-offset-[5px] decoration-pencil text-pencil",
};

export function SeverityTag({ severity, children }: { severity: Severity; children?: ReactNode }) {
  return (
    <span className={`inline-block font-display text-base font-bold leading-none ${STYLE[severity]}`}>
      {children ?? LABEL[severity]}
    </span>
  );
}

export { LABEL as SEVERITY_LABEL };

export const SEVERITY_WORD: Record<Severity, string> = {
  fix: "to fix",
  warn: "to review",
  verify: "to verify",
};
