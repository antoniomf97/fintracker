import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  createRecurring,
  createTransaction,
  fetchCategories,
  generateRecurring,
} from "../api";
import type { Category, Frequency, TransactionType } from "../types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const FREQUENCIES: Frequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
];

// Sentinel select value that reveals the free-text field for a brand-new category.
const NEW_CATEGORY = "__new__";

export function AddTransactionDialog({ onClose, onCreated }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryChoice, setCategoryChoice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [recurring, setRecurring] = useState(false);
  const [requiresIncome, setRequiresIncome] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Non-fatal: the user can still add a new category by typing one.
      });
  }, []);

  const category =
    categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice;

  // Categories are scoped to a transaction type, so only show this type's options.
  const typeCategories = categories.filter((c) => c.type === type);

  function changeType(nextType: TransactionType) {
    setType(nextType);
    // A category picked for the previous type no longer applies.
    setCategoryChoice("");
    setNewCategory("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Please choose or enter a category.");
      return;
    }

    setSubmitting(true);

    try {
      if (recurring) {
        await createRecurring({
          type,
          category,
          amount,
          description: description.trim() || null,
          frequency,
          start_date: date,
          end_date: endDate || null,
          is_active: true,
        });
        // Materialize any transactions already due so they show up right away.
        await generateRecurring();
      } else {
        await createTransaction({
          date,
          type,
          category,
          amount,
          description: description.trim() || null,
          requires_income: requiresIncome,
        });
      }
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form className="dialog" onSubmit={handleSubmit}>
      <h2 className="dialog__title">New Transaction</h2>

      <label className="field">
        <span>Type</span>
        <select
          value={type}
          onChange={(event) =>
            changeType(event.target.value as TransactionType)
          }
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="savings">Savings</option>
        </select>
      </label>

      <label className="field">
        <span>Category</span>
        <select
          value={categoryChoice}
          onChange={(event) => setCategoryChoice(event.target.value)}
          required
        >
          <option value="" disabled>
            Select a category
          </option>
          {typeCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ Add new category…</option>
        </select>
      </label>

      {categoryChoice === NEW_CATEGORY && (
        <label className="field">
          <span>New Category</span>
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="e.g. salary"
            required
            autoFocus
          />
        </label>
      )}

      <label className="field">
        <span>
          Description <em>(optional)</em>
        </span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Amount</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
        />
      </label>

      <label className="field">
        <span>{recurring ? "Start Date" : "Date"}</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </label>

      <div className="field field--inline">
        <span>Recurring</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
          />
          <span className="toggle__slider" />
        </label>
      </div>

      {/* Savings only: unchecking lets the entry skip the available-money check. */}
      {type === "savings" && (
        <div className="field field--inline">
          <span>Requires income</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={requiresIncome}
              onChange={(event) => setRequiresIncome(event.target.checked)}
            />
            <span className="toggle__slider" />
          </label>
        </div>
      )}

      {recurring && (
        <>
          <label className="field">
            <span>Frequency</span>
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as Frequency)
              }
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              End Date <em>(optional)</em>
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </>
      )}

      {error && <p className="dialog__error">{error}</p>}

      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
        >
          {submitting
            ? "Adding…"
            : recurring
              ? "Add Recurring"
              : "Add Transaction"}
        </button>
      </div>
    </form>
  );
}
