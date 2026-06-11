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
    response = client.post(BASE_URL, json={"name": "salary"})
    assert response.status_code == 201
    assert response.json()["name"] == "salary"


def test_create_category_is_idempotent(client):
    first = client.post(BASE_URL, json={"name": "salary"}).json()
    second = client.post(BASE_URL, json={"name": "salary"}).json()
    assert first["id"] == second["id"]
    assert len(client.get(BASE_URL).json()) == 1


def test_creating_transaction_saves_its_category(client):
    payload = {
        "date": "2026-06-08",
        "type": "income",
        "category": "salary",
        "amount": 1000,
    }
    assert client.post(TRANSACTIONS_URL, json=payload).status_code == 201

    names = [c["name"] for c in client.get(BASE_URL).json()]
    assert names == ["salary"]


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
