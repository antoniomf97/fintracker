import { defineConfig, devices } from "@playwright/test";

// Runs the real stack: the FastAPI backend (against an isolated e2e SQLite DB so
// it never touches dev data) and the Vite dev server, then drives the browser.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1, // single shared backend DB — keep tests serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000 --log-level warning",
      cwd: "../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { DATABASE_URL: "sqlite:///./data/e2e_test.db" },
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      cwd: "../frontend",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
