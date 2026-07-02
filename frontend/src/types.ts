export type TransactionType = "income" | "expense" | "savings";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: number;
  date: string;
  type: TransactionType;
  category: string;
  amount: string; // API serializes Decimal as a string to preserve precision
  description: string | null;
}

export interface NewTransaction {
  date: string;
  type: TransactionType;
  category: string;
  amount: string;
  description: string | null;
  // Request-only for savings: when false, creation skips the available-money check.
  // The backend ignores it for other types and never persists it.
  requires_income?: boolean;
}

// "all" means the type filter is off; otherwise it narrows to one transaction type.
export type TypeFilter = TransactionType | "all";

export interface Filters {
  type: TypeFilter;
  category: string;
  from: string; // ISO date (yyyy-mm-dd); empty means no lower bound
  to: string; // ISO date (yyyy-mm-dd); empty means no upper bound
}

export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface RecurringTransaction {
  id: number;
  type: TransactionType;
  category: string;
  amount: string;
  description: string | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_date: string | null;
}

export interface NewRecurring {
  type: TransactionType;
  category: string;
  amount: string;
  description: string | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}
