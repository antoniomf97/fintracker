import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchTransactions } from "./api";
import { AddTransactionDialog } from "./components/AddTransactionDialog";
import { RecurringPanel } from "./components/RecurringPanel";
import { TransactionFilters } from "./components/TransactionFilters";
import type { Filters, Transaction } from "./types";
import "./App.css";

type Overlay = "add" | "recurring" | null;

const EMPTY_FILTERS: Filters = { type: "all", category: "", from: "", to: "" };

function formatAmount(amount: string, type: Transaction["type"]): string {
  const value = Number(amount);
  // Savings is money set aside (a transfer out of available funds), shown neutral.
  const sign = type === "income" ? "+" : type === "expense" ? "-" : "";
  return `${sign}€${value.toFixed(2)}`;
}

// Dates are ISO strings (yyyy-mm-dd), so lexicographic comparison matches date order.
function applyFilters(
  transactions: Transaction[],
  filters: Filters,
): Transaction[] {
  const category = filters.category.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (category && !t.category.toLowerCase().includes(category)) return false;
    if (filters.from && t.date < filters.from) return false;
    if (filters.to && t.date > filters.to) return false;
    return true;
  });
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const visible = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters],
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTransactions()
      .then(setTransactions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1 className="brand">Fintracker</h1>
          <p className="subtitle">Personal Finance Tracker</p>
        </div>
        <button
          type="button"
          className="header__btn"
          onClick={() => setOverlay("recurring")}
        >
          ↻ Recurring
        </button>
      </header>

      <main className="container">
        <section className="card">
          {loading && <p className="status">Loading…</p>}
          {error && <p className="status status--error">{error}</p>}

          {!loading && !error && transactions.length === 0 && (
            <p className="status">No transactions yet.</p>
          )}

          {!loading && !error && transactions.length > 0 && (
            <>
              <TransactionFilters
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(EMPTY_FILTERS)}
              />

              <p className="count">
                {visible.length === transactions.length
                  ? `${transactions.length} transactions`
                  : `${visible.length} of ${transactions.length} transactions`}
              </p>

              {visible.length === 0 ? (
                <p className="status">No transactions match your filters.</p>
              ) : (
                <table className="transactions">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="col-amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>
                          <span className={`badge badge--${t.type}`}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.category}</td>
                        <td>{t.description ?? "—"}</td>
                        <td className={`col-amount amount--${t.type}`}>
                          {formatAmount(t.amount, t.type)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => setOverlay("add")}
        aria-label="Add transaction"
      >
        +
      </button>

      {overlay === "add" && (
        <AddTransactionDialog
          onClose={() => setOverlay(null)}
          onCreated={() => {
            setOverlay(null);
            load();
          }}
        />
      )}

      {overlay === "recurring" && (
        <RecurringPanel onClose={() => setOverlay(null)} onChanged={load} />
      )}
    </div>
  );
}

export default App;
