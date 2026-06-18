import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import { LoginPage } from "./LoginPage";

vi.mock("../api");

beforeEach(() => {
  vi.mocked(api.login).mockResolvedValue("a-token");
});

describe("LoginPage", () => {
  it("logs in and hands the token back", async () => {
    const onLoggedIn = vi.fn();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "devpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(api.login).toHaveBeenCalledWith("admin", "devpassword"),
    );
    expect(onLoggedIn).toHaveBeenCalledWith("a-token");
  });

  it("shows an error and stays put when login fails", async () => {
    vi.mocked(api.login).mockRejectedValueOnce(
      new Error("Incorrect username or password"),
    );
    const onLoggedIn = vi.fn();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Incorrect username or password"),
    ).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });
});
