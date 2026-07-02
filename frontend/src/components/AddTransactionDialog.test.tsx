import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import type { Category } from "../types";
import { AddTransactionDialog } from "./AddTransactionDialog";

vi.mock("../api");

const CATEGORIES: Category[] = [
  { id: 1, name: "food", type: "expense" },
  { id: 2, name: "emergency", type: "savings" },
];

beforeEach(() => {
  vi.mocked(api.fetchCategories).mockResolvedValue(CATEGORIES);
  vi.mocked(api.createTransaction).mockResolvedValue({
    id: 1,
    date: "2026-06-08",
    type: "savings",
    category: "emergency",
    amount: "10.00",
    description: null,
  });
});

describe("AddTransactionDialog", () => {
  it("shows the Requires income toggle only for savings", async () => {
    render(<AddTransactionDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole("option", { name: "food" });

    expect(screen.queryByText("Requires income")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "savings" },
    });
    expect(screen.getByText("Requires income")).toBeInTheDocument();
  });

  it("sends requires_income: false when the toggle is unchecked", async () => {
    const onCreated = vi.fn();
    render(<AddTransactionDialog onClose={vi.fn()} onCreated={onCreated} />);
    await screen.findByRole("option", { name: "food" });

    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "savings" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "emergency" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });

    // The toggle has no accessible name of its own; reach it via its labelled row.
    const toggleRow = screen
      .getByText("Requires income")
      .closest(".field--inline") as HTMLElement;
    fireEvent.click(within(toggleRow).getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));

    await waitFor(() =>
      expect(api.createTransaction).toHaveBeenCalledWith({
        date: expect.any(String),
        type: "savings",
        category: "emergency",
        amount: "10",
        description: null,
        requires_income: false,
      }),
    );
    expect(onCreated).toHaveBeenCalled();
  });
});
