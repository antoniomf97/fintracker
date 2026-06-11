import { useCallback, useEffect, useState } from "react";

import { fetchTransactions } from "./api";
import { AddTransactionDialog } from "./components/AddTransactionDialog";
import type { Transaction } from "./types";
import "./App.css";

function formatAmount(amount: string, type: Transaction["type"]): string {
  const value = Number(amount);
  const sign = type === "expense" ? "-" : "+";
  return `${sign}€${value.toFixed(2)}`;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <h1 className="brand">Fintracker</h1>
        <p className="subtitle">Personal Finance Tracker</p>
      </header>

      <main className="container">
        <section className="card">
          {loading && <p className="status">Loading…</p>}
          {error && <p className="status status--error">{error}</p>}
          {!loading && !error && (
            <p className="count">{transactions.length} transactions</p>
          )}

          {!loading && !error && transactions.length === 0 && (
            <p className="status">No transactions yet.</p>
          )}

          {!loading && !error && transactions.length > 0 && (
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
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>
                      <span className={`badge badge--${t.type}`}>{t.type}</span>
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
        </section>
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => setDialogOpen(true)}
        aria-label="Add transaction"
      >
        +
      </button>

      {dialogOpen && (
        <AddTransactionDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

export default App;
