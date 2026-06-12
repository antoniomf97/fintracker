import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { fetchCategories, updateRecurring } from "../api";
import type {
  Category,
  Frequency,
  RecurringTransaction,
  TransactionType,
} from "../types";

interface Props {
  rule: RecurringTransaction;
  onClose: () => void;
  onSaved: () => void;
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

export function EditRecurringDialog({ rule, onClose, onSaved }: Props) {
  const [type, setType] = useState<TransactionType>(rule.type);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryChoice, setCategoryChoice] = useState(rule.category);
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState(rule.description ?? "");
  const [amount, setAmount] = useState(rule.amount);
  const [frequency, setFrequency] = useState<Frequency>(rule.frequency);
  const [startDate, setStartDate] = useState(rule.start_date);
  const [endDate, setEndDate] = useState(rule.end_date ?? "");
  const [isActive, setIsActive] = useState(rule.is_active);
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
  // Keep the current selection visible even before the list loads (e.g. the rule's
  // own category on first render).
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
      await updateRecurring(rule.id, {
        type,
        category,
        amount,
        description: description.trim() || null,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        is_active: isActive,
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
        <h2 className="dialog__title">Edit Recurring</h2>

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
          <span>Frequency</span>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
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

        <div className="field field--inline">
          <span>Active</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className="toggle__slider" />
          </label>
        </div>

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
