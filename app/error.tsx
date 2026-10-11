"use client";

import { BrokenPage } from "@/components/BrokenPage";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <BrokenPage error={error} retry={retry} />;
}
