import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import type { Category, Transaction } from "../types";
import { EditTransactionDialog } from "./EditTransactionDialog";

vi.mock("../api");

const TRANSACTION: Transaction = {
  id: 7,
  date: "2026-06-01",
  type: "expense",
  category: "food",
  amount: "12.50",
  description: "lunch",
};

const CATEGORIES: Category[] = [
  { id: 1, name: "food", type: "expense" },
  { id: 2, name: "rent", type: "expense" },
  { id: 3, name: "salary", type: "income" },
];

beforeEach(() => {
  vi.mocked(api.fetchCategories).mockResolvedValue(CATEGORIES);
  vi.mocked(api.updateTransaction).mockResolvedValue({
    ...TRANSACTION,
    amount: "20.00",
  });
});

describe("EditTransactionDialog", () => {
  it("prefills the form from the transaction", async () => {
    render(
      <EditTransactionDialog
        transaction={TRANSACTION}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByDisplayValue("food")).toBeInTheDocument();
    expect(screen.getByDisplayValue("lunch")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12.50")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-01")).toBeInTheDocument();
  });

  it("saves the edited fields", async () => {
    const onSaved = vi.fn();
    render(
      <EditTransactionDialog
        transaction={TRANSACTION}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await screen.findByDisplayValue("food");

    fireEvent.change(screen.getByDisplayValue("12.50"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(api.updateTransaction).toHaveBeenCalledWith(7, {
        date: "2026-06-01",
        type: "expense",
        category: "food",
        amount: "20",
        description: "lunch",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("only offers categories for the selected type", async () => {
    render(
      <EditTransactionDialog
        transaction={TRANSACTION}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await screen.findByDisplayValue("food");

    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    // Expense categories + placeholder + "add new", but not the income one.
    expect(options).toContain("food");
    expect(options).toContain("rent");
    expect(options).not.toContain("salary");
  });

  it("surfaces an API error without closing", async () => {
    vi.mocked(api.updateTransaction).mockRejectedValueOnce(
      new Error("Failed to update transaction (422)"),
    );
    render(
      <EditTransactionDialog
        transaction={TRANSACTION}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await screen.findByDisplayValue("food");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Failed to update transaction (422)"),
    ).toBeInTheDocument();
  });
});
