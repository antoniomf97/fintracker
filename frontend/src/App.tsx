import { useEffect, useMemo, useState } from "react";

import {
  clearToken,
  fetchTransactions,
  getToken,
  setUnauthorizedHandler,
} from "./api";
import { AddTransactionDialog } from "./components/AddTransactionDialog";
import { Analytics } from "./components/Analytics";
import { CategoriesPanel } from "./components/CategoriesPanel";
import { EditTransactionDialog } from "./components/EditTransactionDialog";
import {
  AlertTriangleIcon,
  ListIcon,
  LogOutIcon,
  MoonIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  SunIcon,
} from "./components/icons";
import { LoginPage } from "./components/LoginPage";
import { RecurringPanel } from "./components/RecurringPanel";
import { TransactionFilters } from "./components/TransactionFilters";
import { useIsMobile } from "./hooks/useIsMobile";
import { useResource } from "./hooks/useResource";
import { useTheme, type Theme } from "./hooks/useTheme";
import type { Filters, Transaction } from "./types";
import "./App.css";

type Overlay = "add" | "recurring" | "categories" | null;

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

function Dashboard({
  onLogout,
  theme,
  onToggleTheme,
}: {
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const isMobile = useIsMobile();
  const {
    data: transactions,
    loading,
    error,
    reload: load,
  } = useResource<Transaction[]>(fetchTransactions, []);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const visible = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters],
  );

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1 className="brand">Fintracker</h1>
          <p className="subtitle">Personal Finance Tracker</p>
        </div>
        <div className="header__actions">
          <button
            type="button"
            className="header__btn"
            onClick={onToggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            data-tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="header__btn"
            onClick={() => setOverlay("categories")}
          >
            <ListIcon />
            <span className="header__btn-label">Categories</span>
          </button>
          <button
            type="button"
            className="header__btn"
            onClick={() => setOverlay("recurring")}
          >
            <RepeatIcon />
            <span className="header__btn-label">Recurring</span>
          </button>
          <button type="button" className="header__btn" onClick={onLogout}>
            <LogOutIcon />
            <span className="header__btn-label">Logout</span>
          </button>
        </div>
      </header>

      <main className="container">
        {!loading && !error && transactions.length > 0 && (
          <Analytics transactions={transactions} />
        )}

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
                      <th className="col-actions" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((t) => (
                      <tr
                        key={t.id}
                        // On mobile the cogwheel is hidden; tapping the row opens
                        // the same edit dialog. Desktop keeps the explicit button.
                        onClick={isMobile ? () => setEditing(t) : undefined}
                        role={isMobile ? "button" : undefined}
                        tabIndex={isMobile ? 0 : undefined}
                        onKeyDown={
                          isMobile
                            ? (event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setEditing(t);
                                }
                              }
                            : undefined
                        }
                        aria-label={
                          isMobile
                            ? `Edit transaction from ${t.date}`
                            : undefined
                        }
                        className={
                          isMobile ? "transactions__row--tappable" : undefined
                        }
                      >
                        <td data-label="Date">{t.date}</td>
                        <td data-label="Type">
                          <span className={`badge badge--${t.type}`}>
                            {t.type}
                          </span>
                        </td>
                        <td data-label="Category">
                          {t.category ? (
                            t.category
                          ) : (
                            <span
                              className="cat-flag"
                              title="This category was deleted — pick a new one"
                            >
                              <AlertTriangleIcon size={14} />
                              Uncategorized
                            </span>
                          )}
                        </td>
                        <td data-label="Description">{t.description ?? "—"}</td>
                        <td
                          data-label="Amount"
                          className={`col-amount amount--${t.type}`}
                        >
                          {formatAmount(t.amount, t.type)}
                        </td>
                        <td className="col-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setEditing(t)}
                            aria-label={`Edit transaction from ${t.date}`}
                            title="Edit"
                          >
                            <SettingsIcon />
                          </button>
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
        <PlusIcon size={28} />
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

      {overlay === "categories" && (
        <CategoriesPanel onClose={() => setOverlay(null)} onChanged={load} />
      )}

      {editing && (
        <EditTransactionDialog
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onDeleted={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // A 401 from any API call clears the stored token and bounces back to login.
    setUnauthorizedHandler(() => setToken(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  function handleLogout() {
    clearToken();
    setToken(null);
  }

  if (!token) {
    return <LoginPage onLoggedIn={setToken} />;
  }
  return (
    <Dashboard
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

export default App;
