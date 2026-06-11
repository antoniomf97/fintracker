import { useState } from "react";
import type { FormEvent } from "react";

import { updateRecurring } from "../api";
import type {
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

export function EditRecurringDialog({ rule, onClose, onSaved }: Props) {
  const [type, setType] = useState<TransactionType>(rule.type);
  const [category, setCategory] = useState(rule.category);
  const [description, setDescription] = useState(rule.description ?? "");
  const [amount, setAmount] = useState(rule.amount);
  const [frequency, setFrequency] = useState<Frequency>(rule.frequency);
  const [startDate, setStartDate] = useState(rule.start_date);
  const [endDate, setEndDate] = useState(rule.end_date ?? "");
  const [isActive, setIsActive] = useState(rule.is_active);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await updateRecurring(rule.id, {
        type,
        category: category.trim(),
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
            onChange={(event) => setType(event.target.value as TransactionType)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="field">
          <span>Category</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          />
        </label>

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
