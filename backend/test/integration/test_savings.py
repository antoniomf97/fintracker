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


def _txn(type_: str, amount, category="misc"):
    return {"date": "2026-06-08", "type": type_, "category": category, "amount": amount}


def test_savings_within_available_succeeds(client):
    client.post(BASE_URL, json=_txn("income", 1000))
    client.post(BASE_URL, json=_txn("expense", 470))

    # available = 1000 - 470 = 530, so 400 fits.
    response = client.post(BASE_URL, json=_txn("savings", 400, category="investment"))
    assert response.status_code == 201
    assert response.json()["type"] == "savings"


def test_savings_equal_to_available_succeeds(client):
    client.post(BASE_URL, json=_txn("income", 100))

    response = client.post(BASE_URL, json=_txn("savings", 100))
    assert response.status_code == 201


def test_savings_exceeding_available_fails(client):
    client.post(BASE_URL, json=_txn("income", 1000))
    client.post(BASE_URL, json=_txn("expense", 470))
    client.post(BASE_URL, json=_txn("savings", 50))

    # available = 1000 - 470 - 50 = 480, so 500 is rejected.
    response = client.post(BASE_URL, json=_txn("savings", 500))
    assert response.status_code == 400
    assert response.json()["detail"] == "You don't have enough available money"


def test_savings_without_income_fails(client):
    response = client.post(BASE_URL, json=_txn("savings", 10))
    assert response.status_code == 400


def test_rejected_savings_is_not_persisted(client):
    client.post(BASE_URL, json=_txn("income", 100))
    client.post(BASE_URL, json=_txn("savings", 500))

    types = [t["type"] for t in client.get(BASE_URL).json()]
    assert types == ["income"]  # the rejected savings left no row behind
