import type { Filters, TypeFilter } from "../types";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

export function TransactionFilters({ filters, onChange, onClear }: Props) {
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
      </select>

      <input
        className="filters__category"
        type="text"
        placeholder="Category"
        value={filters.category}
        onChange={(event) => update("category", event.target.value)}
      />

      <input
        className="filters__date"
        type="date"
        aria-label="From date"
        value={filters.from}
        onChange={(event) => update("from", event.target.value)}
      />

      <input
        className="filters__date"
        type="date"
        aria-label="To date"
        value={filters.to}
        onChange={(event) => update("to", event.target.value)}
      />

      <button type="button" className="btn btn--ghost" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
