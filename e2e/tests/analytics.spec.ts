import { apiLogin, authHeaders, expect, test } from "./helpers";

const API = "http://localhost:8000/api/v1";

// Seed one of each type via the API so the analytics card has something to render.
// (Income is created first so the savings entry passes the available-funds check.)
test.beforeAll(async ({ request }) => {
  const token = await apiLogin(request);
  const date = new Date().toISOString().slice(0, 10);
  const entries = [
    { type: "income", category: "e2e-salary", amount: "2000.00" },
    { type: "expense", category: "e2e-rent", amount: "800.00" },
    { type: "savings", category: "e2e-fund", amount: "300.00" },
  ];
  for (const entry of entries) {
    const response = await request.post(`${API}/transactions`, {
      data: { date, description: null, ...entry },
      headers: authHeaders(token),
    });
    expect(response.ok()).toBeTruthy();
  }
});

test("renders the summary donut with a balance", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".analytics")).toBeVisible();
  const balance = page.locator(".donut__balance");
  await expect(balance).toBeVisible();
  await expect(balance).toHaveText(/€/);
});

test("scopes the summary with a time-range pill", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "All time" })).toBeVisible();
  await page.getByRole("button", { name: "This month" }).click();
  // The pill becomes active; the donut balance stays rendered.
  await expect(page.locator(".donut__balance")).toBeVisible();
});
