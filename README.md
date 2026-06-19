# Fintracker

A personal finance tracker: log income, expenses, and savings; define recurring
rules; and see where your money goes through a filterable analytics dashboard.

[![CI](https://github.com/antoniomf97/fintracker/actions/workflows/ci.yml/badge.svg)](https://github.com/antoniomf97/fintracker/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## Features

- **Transactions** — income, expense, and savings entries with categories and dates;
  edit any entry from the table via its ⚙ button.
- **Type-scoped categories** — categories are saved as you use them and filtered by
  transaction type (income categories for income, etc.); a Categories panel lets you
  add, rename, or delete them. Renames cascade to existing entries, and deleting a
  category flags the transactions that used it as needing re-categorization.
- **Recurring rules** — daily/weekly/biweekly/monthly/quarterly/yearly schedules that
  materialize transactions up to today, without month-end date drift.
- **Savings guardrail** — a savings entry can't exceed available money
  (`income − expenses − savings`).
- **Filtering** — narrow the table by type, category, and date range.
- **Analytics** — a donut of income/expenses/savings with the running balance, plus
  per-type category breakdown bars and time-range presets (this month, last 3/6
  months, year to date, custom).

## Tech stack

| Area     | Stack                                                              |
| -------- | ----------------------------------------------------------------- |
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2.0, SQLite, managed with **uv** |
| Frontend | React 19, TypeScript, Vite, Recharts                              |
| Tests    | pytest (backend), Vitest + Testing Library (frontend), Playwright (e2e) |
| Tooling  | Ruff, Prettier, ESLint, pre-commit, GitHub Actions                |

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it all fits together.

## Getting started

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.12 is provisioned automatically)
- Node.js 22+
- [Docker](https://docs.docker.com/) (for the local Postgres database)

### Run the app

The backend talks to **Postgres** (matching production). Start a local one and point the
backend at it via `.env`:

```bash
docker compose up -d db          # local Postgres on :5432 (repo root)
cd backend && cp .env.example .env
```

> No Docker? Use the SQLite fallback instead: uncomment the `sqlite://` line in `.env`.

Backend (http://localhost:8000, docs at `/docs`):

```bash
cd backend
uv run fastapi dev app/main.py
```

Frontend (http://localhost:5173) in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The two default ports matter: the frontend calls the API at `http://localhost:8000`
and the backend's CORS only allows `http://localhost:5173`. Override the API URL with
the `VITE_API_URL` env var if needed.

### Run with Docker

Build and start the whole stack with [Docker Compose](https://docs.docker.com/compose/):

```bash
docker compose up --build
```

This starts Postgres, the FastAPI backend (served by uvicorn), and the frontend (built
with Vite and served by nginx), then exposes:

- **App** → http://localhost:8080
- **API** → http://localhost:8000 (docs at `/docs`)

The Postgres data is persisted in the `db-data` volume across restarts. Because Vite
inlines `VITE_API_URL` at build time, the API URL is set via a build arg in
[`docker-compose.yml`](docker-compose.yml) (defaulting to `http://localhost:8000`); the
backend's `CORS_ORIGINS` is set there to match the frontend's `http://localhost:8080`
origin. Adjust both together if you publish on different hosts or ports. In production
`DATABASE_URL` points at a managed Postgres (e.g. Supabase).

### Authentication

The app is multi-user: create an account from the **Sign up** screen, then log in. Each
account's transactions, categories, and recurring rules are private to it. Signup is open,
so anyone who can reach the API can register.

Accounts live in the database; the only auth env var is the JWT signing key:

```bash
JWT_SECRET=<long random string, 32+ chars>
```

In production, set `JWT_SECRET` as a secret on the host (e.g. a Render env var) — never
commit a real value.

### Seed sample data (optional)

With the backend running, populate it from the CSVs in [`scripts/`](scripts/):

```bash
python scripts/populate_db.py --reset
```

The script only uses the standard library and talks to the running API — see
[`scripts/populate_db.py`](scripts/populate_db.py) for options.

## Testing

```bash
# Backend unit + integration tests
cd backend && uv run pytest

# Frontend unit/component tests
cd frontend && npm test

# End-to-end (first run on a machine: npx playwright install chromium)
cd e2e && npm test
```

The e2e suite boots the real backend (against an isolated SQLite file) and the Vite
dev server, then drives Chromium. All three suites also run in CI on every pull
request.

## Project layout

```
backend/    FastAPI service (routers, services, schemas, models)
frontend/   React + Vite single-page app
e2e/        Playwright end-to-end tests
scripts/    Standalone helpers (e.g. seed the DB via the API)
```

## Contributing

Bug reports, features, and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Licensed under the [GNU GPL v3.0](LICENSE).
