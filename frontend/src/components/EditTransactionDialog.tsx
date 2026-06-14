import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { fetchCategories, updateTransaction } from "../api";
import type { Category, Transaction, TransactionType } from "../types";

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

// Sentinel select value that reveals the free-text field for a brand-new category.
const NEW_CATEGORY = "__new__";

export function EditTransactionDialog({
  transaction,
  onClose,
  onSaved,
}: Props) {
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryChoice, setCategoryChoice] = useState(transaction.category);
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [amount, setAmount] = useState(transaction.amount);
  const [date, setDate] = useState(transaction.date);
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
  const typeCategoryNames = categories
    .filter((c) => c.type === type)
    .map((c) => c.name);
  // Keep the current selection visible even before the list loads (e.g. the
  // transaction's own category on first render).
  const optionNames =
    categoryChoice &&
    categoryChoice !== NEW_CATEGORY &&
    !typeCategoryNames.includes(categoryChoice)
      ? [categoryChoice, ...typeCategoryNames]
      : typeCategoryNames;

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
      await updateTransaction(transaction.id, {
        date,
        type,
        category,
        amount,
        description: description.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="dialog__title">Edit Transaction</h2>

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
            {optionNames.map((name) => (
              <option key={name} value={name}>
                {name}
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
            required
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>

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
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
