import { useEffect, useState } from "react";

interface Props {
  from: string; // ISO yyyy-mm-dd or ""
  to: string; // ISO yyyy-mm-dd or ""
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}

export function DateRangeDialog({ from, to, onApply, onClose }: Props) {
  // Drafts so edits commit only on Apply; Cancel/Esc/click-outside discards them.
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function apply() {
    let nextFrom = draftFrom;
    let nextTo = draftTo;
    // Both bounds are optional; if both are set but reversed, swap them.
    if (nextFrom && nextTo && nextFrom > nextTo) {
      [nextFrom, nextTo] = [nextTo, nextFrom];
    }
    onApply(nextFrom, nextTo);
    onClose();
  }

  function clear() {
    onApply("", "");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="dialog__title">Date range</h2>

        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
          />
        </label>

        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
          />
        </label>

        <div className="dialog__actions">
          <button
            type="button"
            className="btn btn--ghost dialog__delete"
            onClick={clear}
          >
            Clear
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
