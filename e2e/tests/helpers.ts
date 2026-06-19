import { test as base, expect, type APIRequestContext } from "@playwright/test";

const API = "http://localhost:8000/api/v1";
const TOKEN_KEY = "fintracker_token";

// The e2e account, created on first run and reused after.
const DEV_CREDENTIALS = { username: "admin", password: "devpassword" };

export async function signupOrLogin(request: APIRequestContext): Promise<string> {
  // Self-provision the account; if it already exists (409), just log in.
  const created = await request.post(`${API}/auth/signup`, {
    data: DEV_CREDENTIALS,
  });
  if (created.ok()) {
    return (await created.json()).access_token;
  }
  const response = await request.post(`${API}/auth/login`, {
    data: DEV_CREDENTIALS,
  });
  return (await response.json()).access_token;
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// Extended `test` that logs in and seeds the token into localStorage before any
// navigation, so the app skips the login screen. Specs import { test, expect }
// from here instead of "@playwright/test".
export const test = base.extend<{ token: string }>({
  token: async ({ request }, use) => {
    await use(await signupOrLogin(request));
  },
  page: async ({ page, token }, use) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [TOKEN_KEY, token] as const,
    );
    await use(page);
  },
});

export { expect };
