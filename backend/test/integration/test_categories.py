import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import require_auth
from app.database import Base, get_db
from app.main import app
from app.models.models import Category  # noqa: F401  (registers table on Base.metadata)

BASE_URL = f"{settings.API_PREFIX}/categories"
TRANSACTIONS_URL = f"{settings.API_PREFIX}/transactions"


@pytest.fixture
def client():
    # Isolated in-memory SQLite so tests never touch the real fintracker.db.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_auth] = lambda: "test-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_categories_start_empty(client):
    response = client.get(BASE_URL)
    assert response.status_code == 200
    assert response.json() == []


def test_create_category(client):
    response = client.post(BASE_URL, json={"name": "salary", "type": "income"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "salary"
    assert body["type"] == "income"


def test_create_category_is_idempotent(client):
    first = client.post(BASE_URL, json={"name": "salary", "type": "income"}).json()
    second = client.post(BASE_URL, json={"name": "salary", "type": "income"}).json()
    assert first["id"] == second["id"]
    assert len(client.get(BASE_URL).json()) == 1


def test_same_name_different_type_are_distinct(client):
    client.post(BASE_URL, json={"name": "other", "type": "income"})
    client.post(BASE_URL, json={"name": "other", "type": "expense"})

    categories = client.get(BASE_URL).json()
    assert {c["type"] for c in categories} == {"income", "expense"}
    assert len(categories) == 2


def test_creating_transaction_saves_its_category_with_type(client):
    payload = {
        "date": "2026-06-08",
        "type": "income",
        "category": "salary",
        "amount": 1000,
    }
    assert client.post(TRANSACTIONS_URL, json=payload).status_code == 201

    categories = client.get(BASE_URL).json()
    assert categories == [{"id": categories[0]["id"], "name": "salary", "type": "income"}]


def test_list_categories_filtered_by_type(client):
    client.post(BASE_URL, json={"name": "salary", "type": "income"})
    client.post(BASE_URL, json={"name": "food", "type": "expense"})
    client.post(BASE_URL, json={"name": "investment", "type": "savings"})

    names = [c["name"] for c in client.get(BASE_URL, params={"type": "expense"}).json()]
    assert names == ["food"]


def test_repeated_category_stored_once_and_sorted(client):
    for category in ("food", "salary", "food"):
        client.post(
            TRANSACTIONS_URL,
            json={
                "date": "2026-06-08",
                "type": "expense",
                "category": category,
                "amount": 10,
            },
        )

    names = [c["name"] for c in client.get(BASE_URL).json()]
    assert names == ["food", "salary"]  # de-duplicated and ordered by name


def test_rename_category_cascades_to_transactions(client):
    client.post(
        TRANSACTIONS_URL,
        json={"date": "2026-06-08", "type": "expense", "category": "food", "amount": 10},
    )
    category = client.get(BASE_URL).json()[0]

    response = client.patch(f"{BASE_URL}/{category['id']}", json={"name": "groceries"})
    assert response.status_code == 200
    assert response.json()["name"] == "groceries"

    # The category list reflects the new name...
    assert [c["name"] for c in client.get(BASE_URL).json()] == ["groceries"]
    # ...and the existing transaction was relabeled, not left pointing at "food".
    assert client.get(TRANSACTIONS_URL).json()[0]["category"] == "groceries"


def test_rename_category_only_touches_matching_type(client):
    client.post(BASE_URL, json={"name": "other", "type": "income"})
    expense = client.post(BASE_URL, json={"name": "other", "type": "expense"}).json()

    client.patch(f"{BASE_URL}/{expense['id']}", json={"name": "misc"})

    categories = {(c["name"], c["type"]) for c in client.get(BASE_URL).json()}
    assert categories == {("other", "income"), ("misc", "expense")}


def test_rename_to_existing_name_conflicts(client):
    client.post(BASE_URL, json={"name": "food", "type": "expense"})
    rent = client.post(BASE_URL, json={"name": "rent", "type": "expense"}).json()

    response = client.patch(f"{BASE_URL}/{rent['id']}", json={"name": "food"})
    assert response.status_code == 409


def test_rename_missing_category_is_404(client):
    assert client.patch(f"{BASE_URL}/999", json={"name": "whatever"}).status_code == 404


def test_delete_category_uncategorizes_its_transactions(client):
    client.post(
        TRANSACTIONS_URL,
        json={"date": "2026-06-08", "type": "expense", "category": "food", "amount": 10},
    )
    category = client.get(BASE_URL).json()[0]

    assert client.delete(f"{BASE_URL}/{category['id']}").status_code == 204

    # The category is gone...
    assert client.get(BASE_URL).json() == []
    # ...and its transaction is left with a blank category (the "needs a category" state).
    assert client.get(TRANSACTIONS_URL).json()[0]["category"] == ""


def test_delete_category_is_durable_across_backfill(client):
    """A deleted category must not be resurrected from the rows that referenced it."""
    from app.database import get_db
    from app.services.categories import backfill_categories

    client.post(
        TRANSACTIONS_URL,
        json={"date": "2026-06-08", "type": "expense", "category": "food", "amount": 10},
    )
    category = client.get(BASE_URL).json()[0]
    client.delete(f"{BASE_URL}/{category['id']}")

    # Re-running the startup backfill should not bring "food" back.
    db = next(app.dependency_overrides[get_db]())
    try:
        backfill_categories(db)
    finally:
        db.close()
    assert client.get(BASE_URL).json() == []


def test_delete_only_affects_matching_type(client):
    income = client.post(BASE_URL, json={"name": "other", "type": "income"}).json()
    client.post(BASE_URL, json={"name": "other", "type": "expense"})

    client.delete(f"{BASE_URL}/{income['id']}")

    remaining = client.get(BASE_URL).json()
    assert [(c["name"], c["type"]) for c in remaining] == [("other", "expense")]


def test_delete_category_uncategorizes_recurring_rules(client):
    recurring_url = f"{settings.API_PREFIX}/recurring"
    client.post(
        recurring_url,
        json={
            "type": "expense",
            "category": "gym",
            "amount": 30,
            "frequency": "monthly",
            "start_date": "2026-01-01",
        },
    )
    category = next(c for c in client.get(BASE_URL).json() if c["name"] == "gym")

    assert client.delete(f"{BASE_URL}/{category['id']}").status_code == 204

    # The rule survives but is left blank, and GET still validates (no min_length on read).
    rules = client.get(recurring_url).json()
    assert rules[0]["category"] == ""


def test_delete_missing_category_is_404(client):
    assert client.delete(f"{BASE_URL}/999").status_code == 404
