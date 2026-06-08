import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.models import Transaction  # noqa: F401  (registers table on Base.metadata)

BASE_URL = f"{settings.API_PREFIX}/transactions"


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


def _sample():
    return {
        "date": "2026-06-08",
        "type": "expense",
        "category": "groceries",
        "amount": 42.5,
        "description": "Weekly shop",
    }


def test_create_transaction(client):
    response = client.post(BASE_URL, json=_sample())
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["category"] == "groceries"
    assert body["amount"] == "42.50"  # Decimal serialized as string to preserve precision


def test_get_transaction(client):
    created = client.post(BASE_URL, json=_sample()).json()
    response = client.get(f"{BASE_URL}/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_transaction(client):
    created = client.post(BASE_URL, json=_sample()).json()
    response = client.patch(f"{BASE_URL}/{created['id']}", json={"amount": 99.0})
    assert response.status_code == 200
    assert response.json()["amount"] == "99.00"
    assert response.json()["category"] == "groceries"  # unchanged


def test_delete_transaction(client):
    created = client.post(BASE_URL, json=_sample()).json()
    response = client.delete(f"{BASE_URL}/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"{BASE_URL}/{created['id']}").status_code == 404


def test_get_missing_transaction_returns_404(client):
    assert client.get(f"{BASE_URL}/999").status_code == 404
