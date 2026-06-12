import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
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
