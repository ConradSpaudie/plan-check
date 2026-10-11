import { defineConfig } from "@playwright/test";

/**
 * End-to-end checks of the real site in Chromium, at desktop and phone size.
 * Local: `npm run build && npm run e2e` starts the production server itself.
 * Live site: `npm run e2e:live`, or set PLAN_CHECK_URL to any deployment.
 */
const live = process.env.PLAN_CHECK_URL;
const PORT = 3123;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: live ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The hero notes fade in once; checking contrast mid-fade would measure a half-transparent note.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1366, height: 800 } } },
    {
      name: "phone",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: live
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
