import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fintracker" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add transaction" }),
  ).toBeVisible();
});
