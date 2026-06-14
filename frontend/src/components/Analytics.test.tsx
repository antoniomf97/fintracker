import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Transaction } from "../types";
import { Analytics } from "./Analytics";

function tx(
  partial: Partial<Transaction> & Pick<Transaction, "type" | "amount">,
): Transaction {
  return {
    id: Math.random(),
    date: "2020-03-15", // old on purpose: outside every "recent" range preset
    category: "misc",
    description: null,
    ...partial,
  };
}

const SAMPLE: Transaction[] = [
  tx({ type: "income", category: "salary", amount: "1000.00" }),
  tx({ type: "income", category: "freelance", amount: "200.00" }),
  tx({ type: "expense", category: "rent", amount: "400.00" }),
  tx({ type: "savings", category: "fund", amount: "100.00" }),
];

function balanceText(): string | null {
  return document.querySelector(".donut__balance")?.textContent ?? null;
}

function showAllTime(): void {
  fireEvent.click(screen.getByRole("button", { name: "All time" }));
}

describe("Analytics", () => {
  it("defaults to 'This month', which excludes older data", () => {
    render(<Analytics transactions={SAMPLE} />);
    // The sample is dated 2020, so the default "This month" view is empty.
    expect(balanceText()).toBe("€0.00");
  });

  it("shows the balance (income - expenses - savings)", () => {
    render(<Analytics transactions={SAMPLE} />);
    showAllTime();
    // 1200 - 400 - 100 = 700
    expect(balanceText()).toBe("€700.00");
  });

  it("totals each type's bar", () => {
    render(<Analytics transactions={SAMPLE} />);
    showAllTime();
    expect(screen.getByText("€1200.00")).toBeInTheDocument(); // income
    expect(screen.getByText("€400.00")).toBeInTheDocument(); // expenses
    expect(screen.getByText("€100.00")).toBeInTheDocument(); // savings
  });

  it("labels the three types in the legend", () => {
    render(<Analytics transactions={SAMPLE} />);
    const legend = document.querySelector(".analytics__legend") as HTMLElement;
    expect(within(legend).getByText("Income")).toBeInTheDocument();
    expect(within(legend).getByText("Expenses")).toBeInTheDocument();
    expect(within(legend).getByText("Savings")).toBeInTheDocument();
  });

  it("recomputes when the time range changes", () => {
    render(<Analytics transactions={SAMPLE} />);
    // Default "This month" excludes the 2020 sample...
    expect(balanceText()).toBe("€0.00");
    // ...and "All time" brings it back.
    showAllTime();
    expect(balanceText()).toBe("€700.00");
  });
});
