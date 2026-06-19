"""Populate fintracker with sample data by calling the running API.

A standalone helper for local testing. It reads ``recurring.csv`` and
``transactions.csv`` (next to this file) and POSTs them to the backend's REST API,
materializing any due recurring occurrences. It depends only on the Python standard
library, so it stays decoupled from the backend code and its dependencies.

Recurring rules are created and generated before the one-off transactions so that
the salary income exists when savings transactions are validated against it.

The API requires an account; the script signs one up on first run (then logs in on
later runs), defaulting to the dev credentials — override with ``--username``/``--password``.

Start the backend first, then run:

    python scripts/populate_db.py
    python scripts/populate_db.py --api-url http://localhost:8000
    python scripts/populate_db.py --reset    # wipe existing data first
    python scripts/populate_db.py --username admin --password secret
"""

import argparse
import csv
import json
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
TRANSACTIONS_CSV = SCRIPT_DIR / "transactions.csv"
RECURRING_CSV = SCRIPT_DIR / "recurring.csv"
DEFAULT_API_URL = "http://localhost:8000"
TIMEOUT = 10
TRUE_VALUES = {"true", "1", "yes"}


def load_transactions() -> list[dict]:
    with TRANSACTIONS_CSV.open(newline="", encoding="utf-8") as f:
        return [
            {
                "date": row["date"].strip(),
                "type": row["type"].strip(),
                "category": row["category"].strip(),
                "amount": row["amount"].strip(),
                "description": (row.get("description") or "").strip() or None,
            }
            for row in csv.DictReader(f)
        ]


def load_recurring() -> list[dict]:
    with RECURRING_CSV.open(newline="", encoding="utf-8") as f:
        return [
            {
                "type": row["type"].strip(),
                "category": row["category"].strip(),
                "amount": row["amount"].strip(),
                "description": (row.get("description") or "").strip() or None,
                "frequency": row["frequency"].strip(),
                "start_date": row["start_date"].strip(),
                "end_date": (row.get("end_date") or "").strip() or None,
                "is_active": (row.get("is_active") or "true").strip().lower() in TRUE_VALUES,
            }
            for row in csv.DictReader(f)
        ]


def _request(method: str, url: str, payload: dict | None = None, token: str | None = None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    return urllib.request.urlopen(request, timeout=TIMEOUT)


def signup_or_login(api_url: str, username: str, password: str) -> str:
    payload = {"username": username, "password": password}
    # Create the account on first run; if it already exists (409), log in instead.
    try:
        with _request("POST", f"{api_url}/api/v1/auth/signup", payload) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as err:
        if err.code != 409:
            raise SystemExit(f"Signup failed: {err.code} {_detail(err)}") from err
    try:
        with _request("POST", f"{api_url}/api/v1/auth/login", payload) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as err:
        raise SystemExit(f"Login failed: {err.code} {_detail(err)}") from err


def _delete_all(api_url: str, resource: str, token: str) -> int:
    with _request("GET", f"{api_url}/api/v1/{resource}", token=token) as response:
        existing = json.load(response)
    for item in existing:
        _request("DELETE", f"{api_url}/api/v1/{resource}/{item['id']}", token=token).close()
    return len(existing)


def _create_each(api_url: str, resource: str, rows: list[dict], token: str) -> int:
    created = 0
    for payload in rows:
        try:
            _request("POST", f"{api_url}/api/v1/{resource}", payload, token=token).close()
            created += 1
        except urllib.error.HTTPError as err:
            label = f"{payload['type']}/{payload['category']} {payload['amount']}"
            print(f"Skipped {resource} {label}: {err.code} {_detail(err)}")
    return created


def populate(api_url: str, reset: bool, username: str, password: str) -> None:
    try:
        token = signup_or_login(api_url, username, password)
        if reset:
            removed_tx = _delete_all(api_url, "transactions", token)
            removed_rules = _delete_all(api_url, "recurring", token)
            print(f"Deleted {removed_tx} transactions and {removed_rules} recurring rules.")

        rules = _create_each(api_url, "recurring", load_recurring(), token)
        with _request("POST", f"{api_url}/api/v1/recurring/generate", token=token) as response:
            generated = json.load(response)["created"]
        transactions = _create_each(api_url, "transactions", load_transactions(), token)
    except urllib.error.URLError as err:
        raise SystemExit(_unreachable(api_url, err)) from err

    print(
        f"Created {rules} recurring rules (+{generated} generated occurrences) "
        f"and {transactions} one-off transactions via {api_url}."
    )


def _detail(err: urllib.error.HTTPError) -> str:
    body = err.read().decode("utf-8", "replace")
    try:
        return json.loads(body).get("detail", body)
    except json.JSONDecodeError:
        return body


def _unreachable(api_url: str, err: urllib.error.URLError) -> str:
    return f"Could not reach the API at {api_url}. Is the backend running? ({err.reason})"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="base URL of the running backend")
    parser.add_argument("--username", default="admin", help="API login username")
    parser.add_argument("--password", default="devpassword", help="API login password")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete all existing transactions and recurring rules before inserting",
    )
    args = parser.parse_args()
    populate(args.api_url, reset=args.reset, username=args.username, password=args.password)


if __name__ == "__main__":
    main()
