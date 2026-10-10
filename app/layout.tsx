import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plan Check: pre-review your ISEF research plan",
  description:
    "Paste your ISEF research plan and form dates. Plan Check marks up what an SRC reviewer would send back, before you submit. Free, and your plan stays in your browser.",
  openGraph: {
    title: "Plan Check",
    description: "Catch what the SRC will send back, before you submit.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1525" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
