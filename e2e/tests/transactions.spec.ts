import { expect, test } from "./helpers";

// Unique so the assertions don't collide with data left by earlier runs.
const CATEGORY = `e2e-${Date.now()}`;

test.describe.serial("transactions", () => {
  test("adds a transaction through the dialog", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();

    const dialog = page.locator("form.dialog");
    await expect(dialog).toBeVisible();

    // Fresh category via the "+ Add new category…" option (type defaults to Expense).
    // Selects in order: [0] Type, [1] Category.
    await dialog.locator("select").nth(1).selectOption("__new__");
    await dialog.getByPlaceholder("e.g. salary").fill(CATEGORY);
    await dialog.getByPlaceholder("0.00").fill("12.34");
    await dialog.getByRole("button", { name: "Add Transaction" }).click();

    await expect(dialog).toBeHidden();
    // The unique category appears in exactly one row; assert its amount there.
    const row = page
      .locator("table.transactions tr")
      .filter({ hasText: CATEGORY });
    await expect(row).toBeVisible();
    await expect(row).toContainText("-€12.34");
  });

  test("filters the table by category", async ({ page }) => {
    await page.goto("/");
    const table = page.locator("table.transactions");
    await expect(table.getByText(CATEGORY)).toBeVisible();

    const categoryFilter = page.getByPlaceholder("Category");
    await categoryFilter.fill(CATEGORY);
    await expect(table.getByText(CATEGORY)).toBeVisible();

    await categoryFilter.fill("zzz-no-such-category");
    await expect(
      page.getByText("No transactions match your filters."),
    ).toBeVisible();
  });
});
