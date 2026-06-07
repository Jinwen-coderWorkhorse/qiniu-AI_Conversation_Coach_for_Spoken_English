import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

const API_DIR = path.resolve(__dirname, "../../api");
const DB_PATH = path.join(API_DIR, "e2e-playwright.db");
const MEDIA_ROOT = path.join(API_DIR, "tmp", "e2e-media");

function sqliteUrl(filePath: string) {
  return `sqlite:///${filePath.replace(/\\/g, "/")}`;
}

function buildApiEnv() {
  return {
    ...process.env,
    DATABASE_URL: sqliteUrl(DB_PATH),
    AI_PROVIDER: "mock",
    REPORT_WORKER_MODE: "sync",
    JWT_SECRET: "e2e-playwright-secret",
    MEDIA_LOCAL_ROOT: MEDIA_ROOT,
  };
}

export default async function globalSetup(_config: FullConfig) {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  if (fs.existsSync(MEDIA_ROOT)) {
    fs.rmSync(MEDIA_ROOT, { recursive: true, force: true });
  }

  fs.mkdirSync(MEDIA_ROOT, { recursive: true });

  const env = buildApiEnv();

  execSync("python -m src.scripts.init_db", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });

  execSync("python -m src.scripts.seed_scenarios", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });
}

export { API_DIR, DB_PATH, MEDIA_ROOT, buildApiEnv, sqliteUrl };
