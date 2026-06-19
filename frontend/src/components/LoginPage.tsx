import { useState } from "react";
import type { FormEvent } from "react";

import { login, signup } from "../api";

interface Props {
  onLoggedIn: (token: string) => void;
}

type Mode = "login" | "signup";

// Keep in sync with the backend's SignupRequest password min_length.
const MIN_PASSWORD_LENGTH = 8;

export function LoginPage({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSignup && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Minimum password length is ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const token = isSignup
        ? await signup(username, password)
        : await login(username, password);
      onLoggedIn(token);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError(null);
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="brand">Fintracker</h1>
        <p className="subtitle">
          {isSignup ? "Create an account" : "Sign in to continue"}
        </p>

        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
          />
        </label>

        {error && <p className="dialog__error">{error}</p>}

        <button
          type="submit"
          className="btn btn--primary login-card__submit"
          disabled={submitting}
        >
          {submitting
            ? isSignup
              ? "Creating…"
              : "Signing in…"
            : isSignup
              ? "Sign up"
              : "Sign in"}
        </button>

        <p className="login-card__switch">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            className="login-card__link"
            onClick={switchMode}
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}
