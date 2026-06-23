import { useState } from "react";

import { deleteRecurring, fetchRecurring, generateRecurring } from "../api";
import { useResource } from "../hooks/useResource";
import type { RecurringTransaction } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditRecurringDialog } from "./EditRecurringDialog";
import { SettingsIcon, XIcon } from "./icons";

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export function RecurringPanel({ onClose, onChanged }: Props) {
  const {
    data: rules,
    loading,
    error,
    reload: load,
    setError,
  } = useResource<RecurringTransaction[]>(fetchRecurring, []);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
            <XIcon />
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
                    <SettingsIcon />
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
