import { useState } from "react";
import type { FormEvent } from "react";

import { createTransaction } from "../api";
import type { NewTransaction, TransactionType } from "../types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddTransactionDialog({ onClose, onCreated }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: NewTransaction = {
      date,
      type,
      category: category.trim(),
      amount,
      description: description.trim() || null,
    };

    try {
      await createTransaction(payload);
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
          placeholder="e.g. groceries"
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
          placeholder="0.00"
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
          {submitting ? "Adding…" : "Add Transaction"}
        </button>
      </div>
    </form>
  );
}
