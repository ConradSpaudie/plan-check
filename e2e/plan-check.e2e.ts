import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";

/**
 * The flows a student actually uses. Each test starts with an empty browser, so saved data never leaks between tests.
 * Runs against a local build in CI and against the live site after every deploy.
 */

const OWN_PLAN = `Bean plants under coloured light

Rationale
Plants use red and blue light most for photosynthesis. This project tests whether light colour changes how tall bean plants grow.

Procedure
1. Experimentation will begin on November 20, 2026.
2. I will plant 20 bean seeds in 20 pots, 10 under red light and 10 under blue light.
3. I will water each pot with 50 mL every two days and measure height with a ruler every two days for 21 days.

Risk and safety
No hazards. I will wash my hands after handling soil.

Data analysis
I will compare mean heights with a t-test.

Bibliography
Smith, J. (2020). Plants and light. Journal of Botany, 4(2), 10-20.`;

const wide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

async function noA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(found, "accessibility violations").toEqual([]);
}

async function loadSample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample plan" }).click();
  await expect(page.locator("#summary-title")).toBeVisible();
}

async function tapFirstMark(page: Page) {
  const point = await page.evaluate(() => {
    const m = document.querySelector("mark");
    if (!m) throw new Error("no marks");
    m.scrollIntoView({ block: "center" });
    const r = m.getClientRects()[0];
    return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 };
  });
  if (wide(page)) await page.mouse.click(point.x, point.y);
  else await page.touchscreen.tap(point.x, point.y);
}

const pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors.length = 0;
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => {
  expect(pageErrors, "uncaught errors in the page").toEqual([]);
});

test("landing page puts the upload box on the first screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Catch what the SRC will send back." })).toBeVisible();
  const box = await page.locator('label[for="hero-file"]').boundingBox();
  expect(box && box.y + box.height).toBeLessThan(page.viewportSize()!.height);
  await expect(page.getByRole("link", { name: "Report a problem" })).toHaveAttribute("href", /^mailto:/);
  await noA11yViolations(page);
});

test("a sample goes straight to a report with counts, tabs and no violations", async ({ page }) => {
  await loadSample(page);
  await expect(page.locator("#summary-title")).toContainText("to fix");
  await expect(page.locator("#summary-title")).toBeInViewport();
  await expect(page.getByText("Still needed from you")).toBeVisible();
  await noA11yViolations(page);
  await page.getByRole("tab", { name: /Forms/ }).click();
  await expect(page.locator("#panel-forms")).toBeVisible();
  await page.getByRole("tab", { name: "Signing order" }).click();
  await expect(page.locator("#panel-order")).toBeVisible();
  await page.getByRole("tab", { name: "Problems" }).click();
  await expect(page.locator("#panel-problems")).toBeVisible();
});

test("Doesn't apply lowers the count, and Restore brings it back", async ({ page }) => {
  await loadSample(page);
  const before = await page.locator("#summary-title").textContent();
  const row = page.locator("#panel-problems button[aria-expanded]").first();
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await page.locator("#panel-problems").getByRole("button", { name: "Doesn't apply" }).first().click();
  await expect(page.locator("#summary-title")).not.toHaveText(before!);
  await page.getByText(/Marked as not applying/).click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("#summary-title")).toHaveText(before!);
});

test("a mark opens its note in place on a computer and in a sheet on a phone", async ({ page }) => {
  await loadSample(page);
  if (!wide(page)) await page.getByRole("tab", { name: "Plan", exact: true }).click();
  await tapFirstMark(page);
  if (wide(page)) {
    const active = page.locator('li[data-active="true"]');
    await expect(active).toBeVisible();
    await expect(active.locator("button[aria-expanded]")).toHaveAttribute("aria-expanded", "true");
  } else {
    const sheet = page.locator("dialog.note-sheet");
    await expect(sheet).toHaveJSProperty("open", true);
    await sheet.getByRole("button", { name: "See all problems" }).click();
    await expect(sheet).toHaveJSProperty("open", false);
    await expect(page.locator(":focus")).toHaveAttribute("aria-expanded", "true");
  }
});

test("work is saved in the browser and Clear my data removes it", async ({ page }) => {
  await loadSample(page);
  const summary = await page.locator("#summary-title").textContent();
  await page.waitForTimeout(500); // saving is debounced
  await page.reload();
  await page.getByRole("button", { name: "Pick up where you left off" }).click();
  await expect(page.locator("#summary-title")).toHaveText(summary!);
  await page.getByRole("button", { name: "Clear my data" }).last().click();
  await page.getByRole("button", { name: "Select again to clear everything" }).click();
  await expect(page.locator("#plan")).toHaveValue("");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem("plancheck:v1"))).toBeNull();
});

test("pasting your own plan over the sample drops the sample's dates", async ({ page }) => {
  await loadSample(page);
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: /Your plan/ }).click();
  await page.locator("#plan").fill(OWN_PLAN);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#d-start")).toHaveValue("2026-11-20");
  await expect(page.locator("#d-f1")).toHaveValue("");
  await expect(page.locator("#d-deadline")).toHaveValue("");
  await page.getByRole("button", { name: "See my report" }).click();
  await expect(page.locator("#panel-problems")).not.toContainText("you entered");
  await expect(page.locator("#panel-problems")).not.toContainText("11/02/26");
});

test("confirm step: ticks update the report live and hidden form dates are ignored", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Paste the text instead" }).click();
  await page.locator("#plan").fill(OWN_PLAN);
  await page.getByRole("button", { name: "Continue" }).click();
  await noA11yViolations(page);
  const bar = page.getByText("Your report so far").locator("..");
  await page.getByLabel(/People take part/).check();
  await expect(page.locator("#d-f4")).toBeVisible();
  await page.locator("#d-f4").fill("2026-11-25");
  await page.getByLabel(/People take part/).uncheck();
  await expect(page.locator("#d-f4")).toHaveCount(0);
  await expect(bar).toBeVisible();
  await page.getByRole("button", { name: "See my report" }).click();
  await expect(page.locator("#panel-problems")).not.toContainText("Form 4");
});

test("a date read from the plan can be marked as not the right one", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Paste the text instead" }).click();
  await page.locator("#plan").fill(OWN_PLAN);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Filled in from your plan")).toBeVisible();
  await page.getByRole("button", { name: "Not the right date" }).click();
  await expect(page.locator("#d-start")).toHaveValue("");
  await expect(page.getByText(/Ignoring 11\/20\/2026/)).toBeVisible();
  await page.getByRole("button", { name: "Use it again" }).click();
  await expect(page.locator("#d-start")).toHaveValue("2026-11-20");
});

test("uploads a text file from the first screen", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#hero-file", { name: "plan.txt", mimeType: "text/plain", buffer: Buffer.from(OWN_PLAN) });
  await expect(page.locator("#step2-title")).toBeVisible();
  await expect(page.getByText(/Read \d+ words from plan\.txt/)).toBeVisible();
});

test("uploads a Word file", async ({ page }) => {
  const zip = new JSZip();
  const paras = OWN_PLAN.split("\n")
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p>`)
    .join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}</w:body></w:document>`);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await page.goto("/");
  await page.setInputFiles("#hero-file", {
    name: "plan.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
  });
  await expect(page.getByText(/Read \d+ words from plan\.docx/)).toBeVisible();
  await expect(page.locator("#d-start")).toHaveValue("2026-11-20");
});

test("uploads a PDF", async ({ page, browser }) => {
  const maker = await browser.newPage();
  const html = OWN_PLAN.split("\n\n")
    .map((b) => `<p>${b.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("");
  await maker.setContent(`<html><body style="font: 12pt Arial; width: 6.5in">${html}</body></html>`);
  const buffer = await maker.pdf({ format: "Letter" });
  await maker.close();
  await page.goto("/");
  await page.setInputFiles("#hero-file", { name: "plan.pdf", mimeType: "application/pdf", buffer });
  await expect(page.getByText(/Read \d+ words from plan\.pdf/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#d-start")).toHaveValue("2026-11-20");
});

test("the AI review route stays closed unless it is switched on", async ({ request }) => {
  const res = await request.post("/api/review", { data: { plan: "short" } });
  expect([400, 404]).toContain(res.status());
});

test("error reports are accepted only in the expected shape", async ({ request }) => {
  const ok = await request.post("/api/client-error", {
    data: { kind: "window-error", message: "e2e check, ignore", path: "/", version: "e2e", ua: "playwright" },
  });
  expect(ok.status()).toBe(204);
  const bad = await request.post("/api/client-error", { data: { plan: "a whole plan should never be accepted" } });
  expect(bad.status()).toBe(400);
});
