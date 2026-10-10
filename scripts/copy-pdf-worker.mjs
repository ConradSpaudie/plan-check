// Copies the pdf.js worker into /public so PDFs are read in the browser without any outside request.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// The legacy worker matches the legacy build the app loads, which runs in older browsers too.
const src = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
copyFileSync(src, new URL("../public/pdf.worker.legacy.min.mjs", import.meta.url));
console.log("Copied pdf.js worker to public/");
