import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import type { Category } from "../types";
import { CategoriesPanel } from "./CategoriesPanel";

vi.mock("../api");

const CATEGORIES: Category[] = [
  { id: 1, name: "salary", type: "income" },
  { id: 2, name: "food", type: "expense" },
  { id: 3, name: "rent", type: "expense" },
];

beforeEach(() => {
  vi.mocked(api.fetchCategories).mockResolvedValue(CATEGORIES);
  vi.mocked(api.createCategory).mockResolvedValue({
    id: 4,
    name: "bonus",
    type: "income",
  });
  vi.mocked(api.updateCategory).mockResolvedValue({
    id: 2,
    name: "groceries",
    type: "expense",
  });
  vi.mocked(api.deleteCategory).mockResolvedValue();
});

describe("CategoriesPanel", () => {
  it("groups loaded categories under their type", async () => {
    render(<CategoriesPanel onClose={vi.fn()} onChanged={vi.fn()} />);

    expect(await screen.findByText("salary")).toBeInTheDocument();
    expect(screen.getByText("food")).toBeInTheDocument();
    expect(screen.getByText("rent")).toBeInTheDocument();
    // One badge per type, even savings (which has no categories yet).
    expect(screen.getByText("savings")).toBeInTheDocument();
    expect(screen.getByText("No savings categories yet.")).toBeInTheDocument();
  });

  it("creates a new category for its type", async () => {
    const onChanged = vi.fn();
    render(<CategoriesPanel onClose={vi.fn()} onChanged={onChanged} />);
    await screen.findByText("salary");

    // The income group's "Add category" affordance is the first one.
    fireEvent.click(screen.getAllByText("+ Add category")[0]);
    fireEvent.change(screen.getByPlaceholderText("New income category"), {
      target: { value: "bonus" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(api.createCategory).toHaveBeenCalledWith("bonus", "income"),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("renames a category", async () => {
    const onChanged = vi.fn();
    render(<CategoriesPanel onClose={vi.fn()} onChanged={onChanged} />);
    await screen.findByText("food");

    fireEvent.click(screen.getByRole("button", { name: "Edit food" }));
    fireEvent.change(screen.getByDisplayValue("food"), {
      target: { value: "groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(api.updateCategory).toHaveBeenCalledWith(2, "groceries"),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("deletes a category only after confirmation", async () => {
    const onChanged = vi.fn();
    render(<CategoriesPanel onClose={vi.fn()} onChanged={onChanged} />);
    await screen.findByText("food");

    // Opening the row's delete asks for confirmation; nothing is deleted yet.
    fireEvent.click(screen.getByRole("button", { name: "Delete food" }));
    expect(api.deleteCategory).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Delete the "food" expense category/),
    ).toBeInTheDocument();

    // The confirm dialog's button is named exactly "Delete".
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith(2));
    expect(onChanged).toHaveBeenCalled();
  });

  it("surfaces a rename conflict error without closing the editor", async () => {
    vi.mocked(api.updateCategory).mockRejectedValueOnce(
      new Error('A "rent" expense category already exists.'),
    );
    render(<CategoriesPanel onClose={vi.fn()} onChanged={vi.fn()} />);
    await screen.findByText("food");

    fireEvent.click(screen.getByRole("button", { name: "Edit food" }));
    fireEvent.change(screen.getByDisplayValue("food"), {
      target: { value: "rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText('A "rent" expense category already exists.'),
    ).toBeInTheDocument();
  });
});
