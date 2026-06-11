import type { NewTransaction, Transaction } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchTransactions(): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE}/api/v1/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to load transactions (${response.status})`);
  }
  return response.json();
}

export async function createTransaction(
  payload: NewTransaction,
): Promise<Transaction> {
  const response = await fetch(`${API_BASE}/api/v1/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create transaction (${response.status})`);
  }
  return response.json();
}
