import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Filters } from "../types";
import { TransactionFilters } from "./TransactionFilters";

const EMPTY: Filters = { type: "all", category: "", from: "", to: "" };

describe("TransactionFilters", () => {
  it("reflects the current filter values", () => {
    render(
      <TransactionFilters
        filters={{ type: "expense", category: "food", from: "", to: "" }}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Filter by type")).toHaveValue("expense");
    expect(screen.getByPlaceholderText("Category")).toHaveValue("food");
  });

  it("offers every transaction type plus 'all'", () => {
    render(
      <TransactionFilters
        filters={EMPTY}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["all", "income", "expense", "savings"]);
  });

  it("emits the updated type, preserving other fields", () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters
        filters={{ ...EMPTY, category: "rent" }}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter by type"), {
      target: { value: "income" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY,
      category: "rent",
      type: "income",
    });
  });

  it("emits the typed category", () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters
        filters={EMPTY}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Category"), {
      target: { value: "groceries" },
    });

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, category: "groceries" });
  });

  it("calls onClear when Clear is clicked", () => {
    const onClear = vi.fn();
    render(
      <TransactionFilters
        filters={EMPTY}
        onChange={vi.fn()}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
