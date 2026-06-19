import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import { LoginPage } from "./LoginPage";

vi.mock("../api");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.login).mockResolvedValue("a-token");
  vi.mocked(api.signup).mockResolvedValue("new-token");
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

  it("switches to sign-up mode and registers", async () => {
    const onLoggedIn = vi.fn();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    // In sign-up mode the submit button is the only "Sign up" button.
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(api.signup).toHaveBeenCalledWith("newuser", "password123"),
    );
    expect(api.login).not.toHaveBeenCalled();
    expect(onLoggedIn).toHaveBeenCalledWith("new-token");
  });

  it("rejects a too-short signup password without calling the API", async () => {
    const onLoggedIn = vi.fn();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByText(/Minimum password length is 8/),
    ).toBeInTheDocument();
    expect(api.signup).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
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
