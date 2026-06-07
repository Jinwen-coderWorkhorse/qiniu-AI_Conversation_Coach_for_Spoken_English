import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  installFixtureRecording,
  loadInterviewFixture,
  submitFixtureRecording,
} from "../helpers/fixtureMedia";

const REPORT_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../fixtures/default.report.json"), "utf8"),
) as {
  overall_score: number;
  level_description: string;
  one_sentence_summary: string;
};

const MOCK_AI_REPLY =
  "Thanks, Alex. Could you tell me more about your role in that project?";

test.describe("main flow", () => {
  test.describe.configure({ mode: "serial" });

  test("mock practice journey from scenario pick to history review", async ({ page }) => {
    const interviewFixture = loadInterviewFixture();

    await installFixtureRecording(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "AI 英语口语陪练" })).toBeVisible();
    await expect(page.getByRole("link", { name: /英文面试/ })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: /英文面试/ }).click();

    await expect(page.getByRole("heading", { name: "英文面试" })).toBeVisible();
    await page.getByRole("button", { name: "开始练习" }).click();

    await expect(page).toHaveURL(/\/practice\/sessions\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "英文面试" })).toBeVisible();
    await expect(page.getByRole("button", { name: "按住说话" })).toBeEnabled({
      timeout: 30_000,
    });

    await submitFixtureRecording(page);

    await expect(page.getByRole("heading", { name: "识别结果" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(interviewFixture.transcript)).toBeVisible();
    await page.getByRole("button", { name: "确认" }).click();

    await expect(page.getByText(MOCK_AI_REPLY)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "结束练习" }).click();
    await expect(page.getByRole("dialog", { name: /结束这次练习/ })).toBeVisible();
    await page.getByRole("button", { name: "确认结束" }).click();

    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(
      page.getByLabel("得分").getByText(String(REPORT_FIXTURE.overall_score)),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: REPORT_FIXTURE.level_description })).toBeVisible();
    await expect(page.getByText(REPORT_FIXTURE.one_sentence_summary)).toBeVisible();

    const sessionId = page.url().match(/\/reports\/([0-9a-f-]+)/)?.[1];
    expect(sessionId).toBeTruthy();

    await page.getByRole("link", { name: "查看改进建议" }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+\/improvements$/);
    await expect(page.getByRole("heading", { name: "具体怎么改" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "打开练习历史" }).click();
    await expect(page.getByRole("dialog", { name: "练习历史" })).toBeVisible();
    await expect(page.getByRole("link", { name: /英文面试/ })).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("link", { name: /英文面试/ })
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`/history/${sessionId}$`));
    await expect(page.getByRole("heading", { name: "英文面试" })).toBeVisible();
    await expect(page.getByText(interviewFixture.transcript)).toBeVisible();
    await expect(page.getByText(MOCK_AI_REPLY)).toBeVisible();
    await expect(page.getByRole("link", { name: "查看练习报告" })).toHaveAttribute(
      "href",
      `/reports/${sessionId}`,
    );
  });
});
