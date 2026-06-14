# Contributing to Fintracker

Thanks for your interest in improving Fintracker! This guide covers the local setup,
the checks that run in CI, and the conventions we follow. By participating you agree
to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Local setup

Install the prerequisites: [uv](https://docs.astral.sh/uv/) and Node.js 22+.

```bash
# Backend deps (creates backend/.venv from the lockfile)
cd backend && uv sync

# Frontend deps
cd ../frontend && npm install

# E2E deps (only if you'll touch end-to-end tests)
cd ../e2e && npm install && npx playwright install chromium
```

See the [README](README.md#getting-started) for how to run the app.

## Pre-commit hooks

We use [pre-commit](https://pre-commit.com/) to format and lint on commit (Ruff for
Python, Prettier for the frontend, plus whitespace/JSON/YAML checks). Install it once:

```bash
pip install pre-commit   # or: uv tool install pre-commit
pre-commit install
```

Run against everything before pushing:

```bash
pre-commit run --all-files
```

## Tests and checks

Please keep all suites green and add tests for new behavior.

| Scope            | Command                                          |
| ---------------- | ------------------------------------------------ |
| Backend tests    | `cd backend && uv run pytest`                    |
| Backend lint     | `cd backend && uv run ruff check .`              |
| Frontend tests   | `cd frontend && npm test`                        |
| Frontend lint    | `cd frontend && npm run lint`                    |
| Frontend build   | `cd frontend && npm run build` (type-checks too) |
| End-to-end       | `cd e2e && npm test`                             |

CI runs the same checks on every pull request via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml): pre-commit, backend tests,
frontend (lint + build + unit tests), and the Playwright e2e suite.

### Where tests live

- **Backend** — `backend/test/` (`unit/` for pure logic, `integration/` for API tests
  using an isolated in-memory SQLite database).
- **Frontend** — colocated next to the component under test
  (`src/components/Foo.test.tsx`); shared setup is in `src/test/setup.ts`.
- **E2E** — `e2e/tests/*.spec.ts`, driven against the real stack.

## Code style

- **Python** — formatted and linted by Ruff (line length 100). Type hints throughout;
  the layering is routers → services → schemas/models (see
  [ARCHITECTURE.md](ARCHITECTURE.md)).
- **TypeScript/React** — Prettier + ESLint (incl. the React Hooks rules). Function
  components with hooks; no `eslint-disable` to silence Hooks warnings — fix the root
  cause instead.
- Match the surrounding code; keep comments for the non-obvious "why", not the "what".

## Pull requests

1. Branch off `master`.
2. Make focused commits; keep the diff scoped to one change.
3. Ensure the checks above pass locally (`pre-commit run --all-files` + the test suites).
4. Open a PR against `master` and fill in the
   [PR template](.github/pull_request_template.md). Link any related issue.

Use the [issue templates](.github/ISSUE_TEMPLATE/) to report bugs or propose features.
