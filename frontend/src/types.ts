export type TransactionType = "income" | "expense";

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
