import type {
  Category,
  NewRecurring,
  NewTransaction,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Prefer FastAPI's `detail` message (e.g. the savings limit error) over a generic
// status string, falling back when the body isn't the expected JSON shape.
async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      return body.detail;
    }
  } catch {
    // Body wasn't JSON — use the fallback below.
  }
  return fallback;
}

const TOKEN_KEY = "fintracker_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// The app registers a handler here so a 401 (expired/invalid token) can force a
// logout from anywhere, without each call site having to know about routing/state.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// fetch wrapper for authenticated calls: attaches the bearer token and turns a 401
// into a forced logout (clear the token + notify the app).
async function authFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new Error("Your session has expired. Please log in again.");
  }
  return response;
}

// Login and signup use a plain fetch (no token yet, and a failure shouldn't trigger
// the global logout handler). On success the token is stored for later authFetch calls.
export async function login(
  username: string,
  password: string,
): Promise<string> {
  return authenticate("login", username, password);
}

export async function signup(
  username: string,
  password: string,
): Promise<string> {
  return authenticate("signup", username, password);
}

async function authenticate(
  action: "login" | "signup",
  username: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const fallback = action === "signup" ? "Sign up" : "Login";
    throw new Error(
      await errorMessage(response, `${fallback} failed (${response.status})`),
    );
  }
  const body: { access_token: string } = await response.json();
  setToken(body.access_token);
  return body.access_token;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await authFetch(`${API_BASE}/api/v1/categories`);
  if (!response.ok) {
    throw new Error(`Failed to load categories (${response.status})`);
  }
  return response.json();
}

export async function createCategory(
  name: string,
  type: TransactionType,
): Promise<Category> {
  const response = await authFetch(`${API_BASE}/api/v1/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type }),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to create category (${response.status})`,
      ),
    );
  }
  return response.json();
}

export async function updateCategory(
  id: number,
  name: string,
): Promise<Category> {
  const response = await authFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to update category (${response.status})`,
      ),
    );
  }
  return response.json();
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to delete category (${response.status})`,
      ),
    );
  }
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const response = await authFetch(`${API_BASE}/api/v1/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to load transactions (${response.status})`);
  }
  return response.json();
}

export async function createTransaction(
  payload: NewTransaction,
): Promise<Transaction> {
  const response = await authFetch(`${API_BASE}/api/v1/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to create transaction (${response.status})`,
      ),
    );
  }
  return response.json();
}

export async function updateTransaction(
  id: number,
  payload: Partial<NewTransaction>,
): Promise<Transaction> {
  const response = await authFetch(`${API_BASE}/api/v1/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to update transaction (${response.status})`,
      ),
    );
  }
  return response.json();
}

export async function deleteTransaction(id: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/v1/transactions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(
        response,
        `Failed to delete transaction (${response.status})`,
      ),
    );
  }
}

export async function fetchRecurring(): Promise<RecurringTransaction[]> {
  const response = await authFetch(`${API_BASE}/api/v1/recurring`);
  if (!response.ok) {
    throw new Error(`Failed to load recurring rules (${response.status})`);
  }
  return response.json();
}

export async function createRecurring(
  payload: NewRecurring,
): Promise<RecurringTransaction> {
  const response = await authFetch(`${API_BASE}/api/v1/recurring`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create recurring rule (${response.status})`);
  }
  return response.json();
}

export async function updateRecurring(
  id: number,
  payload: Partial<NewRecurring>,
): Promise<RecurringTransaction> {
  const response = await authFetch(`${API_BASE}/api/v1/recurring/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update recurring rule (${response.status})`);
  }
  return response.json();
}

export async function deleteRecurring(id: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/v1/recurring/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete recurring rule (${response.status})`);
  }
}

export async function generateRecurring(): Promise<number> {
  const response = await authFetch(`${API_BASE}/api/v1/recurring/generate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to generate transactions (${response.status})`);
  }
  const body: { created: number } = await response.json();
  return body.created;
}
