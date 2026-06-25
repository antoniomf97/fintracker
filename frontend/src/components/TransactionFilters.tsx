import { useState } from "react";

import type { Filters, TypeFilter } from "../types";
import { DateRangeDialog } from "./DateRangeDialog";
import { formatRange } from "./dateRange";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

export function TransactionFilters({ filters, onChange, onClear }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="filters">
      <select
        aria-label="Filter by type"
        value={filters.type}
        onChange={(event) => update("type", event.target.value as TypeFilter)}
      >
        <option value="all">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="savings">Savings</option>
      </select>

      <input
        className="filters__category"
        type="text"
        placeholder="Category"
        value={filters.category}
        onChange={(event) => update("category", event.target.value)}
      />

      {/* The from/to range lives in a shared dialog; the label doubles as its
          current value (formatRange returns "Date range" when unset). */}
      <button
        type="button"
        className="btn btn--ghost filters__range"
        onClick={() => setPickerOpen(true)}
      >
        {formatRange(filters.from, filters.to)}
      </button>

      <button type="button" className="btn btn--ghost" onClick={onClear}>
        Clear
      </button>

      {pickerOpen && (
        <DateRangeDialog
          from={filters.from}
          to={filters.to}
          onApply={(from, to) => onChange({ ...filters, from, to })}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
