import { test as base, expect, type APIRequestContext } from "@playwright/test";

const API = "http://localhost:8000/api/v1";
const TOKEN_KEY = "fintracker_token";

// The e2e backend runs with the default dev credentials.
const DEV_CREDENTIALS = { username: "admin", password: "devpassword" };

export async function apiLogin(request: APIRequestContext): Promise<string> {
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
    await use(await apiLogin(request));
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
