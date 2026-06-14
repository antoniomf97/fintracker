import { useState } from "react";

import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../api";
import { useResource } from "../hooks/useResource";
import type { Category, TransactionType } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

const TYPES: TransactionType[] = ["income", "expense", "savings"];

export function CategoriesPanel({ onClose, onChanged }: Props) {
  const {
    data: categories,
    loading,
    error,
    reload: load,
    setError,
  } = useResource<Category[]>(fetchCategories, []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<TransactionType | null>(null);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(category: Category) {
    setError(null);
    setAdding(null);
    setEditingId(category.id);
    setDraft(category.name);
  }

  async function saveEdit(category: Category) {
    const name = draft.trim();
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      await updateCategory(category.id, name);
      setEditingId(null);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startAdd(type: TransactionType) {
    setError(null);
    setEditingId(null);
    setAdding(type);
    setNewName("");
  }

  async function saveAdd(type: TransactionType) {
    const name = newName.trim();
    if (!name) {
      setAdding(null);
      return;
    }
    setBusy(true);
    try {
      await createCategory(name, type);
      setAdding(null);
      setNewName("");
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteCategory(deleting.id);
      setDeleting(null);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <aside className="panel">
        <div className="panel__header">
          <h2 className="dialog__title">Categories</h2>
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

        {!loading &&
          TYPES.map((type) => {
            const items = categories.filter((c) => c.type === type);
            return (
              <section key={type} className="cat-group">
                <span className={`badge badge--${type}`}>{type}</span>

                {items.length === 0 && adding !== type && (
                  <p className="cat-group__empty">No {type} categories yet.</p>
                )}

                {items.length > 0 && (
                  <ul className="cats">
                    {items.map((category) => (
                      <li key={category.id} className="cat">
                        {editingId === category.id ? (
                          <>
                            <input
                              className="cat__input"
                              value={draft}
                              onChange={(event) => setDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveEdit(category);
                                if (event.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                            />
                            <div className="cat__actions">
                              <button
                                type="button"
                                className="btn btn--primary"
                                onClick={() => saveEdit(category)}
                                disabled={busy}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="cat__name">{category.name}</span>
                            <div className="cat__actions">
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => startEdit(category)}
                                aria-label={`Edit ${category.name}`}
                                title="Edit"
                              >
                                ⚙
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                onClick={() => {
                                  setError(null);
                                  setEditingId(null);
                                  setAdding(null);
                                  setDeleting(category);
                                }}
                                aria-label={`Delete ${category.name}`}
                                title="Delete"
                              >
                                🗑
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {adding === type ? (
                  <div className="cat cat--adding">
                    <input
                      className="cat__input"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveAdd(type);
                        if (event.key === "Escape") setAdding(null);
                      }}
                      placeholder={`New ${type} category`}
                      autoFocus
                    />
                    <div className="cat__actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => saveAdd(type)}
                        disabled={busy}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setAdding(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cat-group__add"
                    onClick={() => startAdd(type)}
                  >
                    + Add category
                  </button>
                )}
              </section>
            );
          })}
      </aside>

      {deleting && (
        <ConfirmDialog
          message={`Delete the "${deleting.name}" ${deleting.type} category? Transactions still using it will be flagged as needing a category.`}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
