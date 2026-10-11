"use client";

import "./globals.css";
import { BrokenPage } from "@/components/BrokenPage";

/** Catches errors in the root layout itself, so even then the student sees a way forward. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <BrokenPage error={error} retry={retry} />
      </body>
    </html>
  );
}
