import { useCallback, useEffect, useState } from "react";

import { deleteRecurring, fetchRecurring, generateRecurring } from "../api";
import type { RecurringTransaction } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditRecurringDialog } from "./EditRecurringDialog";

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export function RecurringPanel({ onClose, onChanged }: Props) {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRecurring()
      .then(setRules)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteRecurring(deleting.id);
      setDeleting(null);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleGenerate() {
    try {
      await generateRecurring();
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <aside className="panel">
        <div className="panel__header">
          <h2 className="dialog__title">Recurring</h2>
          <button
            type="button"
            className="panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading && <p className="status">Loading…</p>}
        {error && <p className="status status--error">{error}</p>}
        {!loading && !error && rules.length === 0 && (
          <p className="status">No recurring rules yet.</p>
        )}

        {!loading && !error && rules.length > 0 && (
          <ul className="rules">
            {rules.map((r) => (
              <li key={r.id} className="rule">
                <div className="rule__info">
                  <span className={`badge badge--${r.type}`}>{r.type}</span>
                  <strong className="rule__category">{r.category}</strong>
                  <div className="rule__meta">
                    {r.frequency} · €{Number(r.amount).toFixed(2)}
                    {r.is_active ? "" : " · paused"}
                  </div>
                </div>
                <div className="rule__actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setEditing(r)}
                    aria-label="Edit"
                    title="Edit"
                  >
                    ⚙
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setDeleting(r)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="panel__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleGenerate}
          >
            Generate due now
          </button>
        </div>
      </aside>

      {editing && (
        <EditRecurringDialog
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChanged();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete the ${deleting.frequency} "${deleting.category}" recurring rule? Transactions it already created will be kept.`}
          busy={deleteBusy}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
