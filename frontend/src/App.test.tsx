import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import App from "./App";

vi.mock("./api");

beforeEach(() => {
  // A stored token makes App render the dashboard instead of the login page.
  vi.mocked(api.getToken).mockReturnValue("test-token");
  vi.mocked(api.fetchTransactions).mockResolvedValue([
    {
      id: 1,
      date: "2026-06-01",
      type: "expense",
      category: "", // category was deleted — should be flagged
      amount: "12.00",
      description: null,
    },
  ]);
});

describe("App", () => {
  it("flags a transaction whose category was deleted", async () => {
    render(<App />);
    expect(await screen.findByText(/⚠ Uncategorized/)).toBeInTheDocument();
  });
});
