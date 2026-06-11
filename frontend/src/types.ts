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
