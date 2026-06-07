import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { buildApiEnv, sqliteUrl } from "./e2e/global-setup";

const webPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "8000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const apiDir = path.resolve(__dirname, "../api");
const dbPath = path.join(apiDir, "e2e-playwright.db");
const mediaRoot = path.join(apiDir, "tmp", "e2e-media");
const apiEnv = buildApiEnv();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    permissions: ["microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--disable-web-security"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "python -m uvicorn src.main:app --host 127.0.0.1 --port 8000",
      cwd: apiDir,
      url: `${apiBaseURL}/health`,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
      env: {
        ...apiEnv,
        DATABASE_URL: sqliteUrl(dbPath),
        MEDIA_LOCAL_ROOT: mediaRoot,
      },
    },
    {
      command: "npm run dev -- --port 3000",
      url: baseURL,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: `${apiBaseURL}/api/v1`,
      },
    },
  ],
});
