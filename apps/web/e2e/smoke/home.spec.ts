import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage is accessible after web starts", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/AI English Coach/);
    await expect(page.getByRole("heading", { name: "AI 英语口语陪练" })).toBeVisible();
  });
});
