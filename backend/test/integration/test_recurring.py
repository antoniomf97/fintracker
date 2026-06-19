from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import models  # noqa: F401  (registers tables on Base.metadata)
from app.models.models import User

RECURRING_URL = f"{settings.API_PREFIX}/recurring"
TRANSACTIONS_URL = f"{settings.API_PREFIX}/transactions"


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    seed = testing_session()
    user = User(username="tester", password_hash="x")
    seed.add(user)
    seed.commit()
    seed.refresh(user)
    seed.close()

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()


def _rule(**overrides):
    payload = {
        "type": "income",
        "category": "salary",
        "amount": "1000.00",
        "frequency": "monthly",
        "start_date": "2026-01-15",
    }
    payload.update(overrides)
    return payload


def test_create_recurring(client):
    response = client.post(RECURRING_URL, json=_rule())
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["frequency"] == "monthly"
    assert body["is_active"] is True
    assert body["last_generated_date"] is None


def test_list_and_get_recurring(client):
    created = client.post(RECURRING_URL, json=_rule()).json()
    assert len(client.get(RECURRING_URL).json()) == 1
    assert client.get(f"{RECURRING_URL}/{created['id']}").json()["id"] == created["id"]


def test_update_recurring(client):
    created = client.post(RECURRING_URL, json=_rule()).json()
    response = client.patch(f"{RECURRING_URL}/{created['id']}", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_delete_recurring(client):
    created = client.post(RECURRING_URL, json=_rule()).json()
    assert client.delete(f"{RECURRING_URL}/{created['id']}").status_code == 204
    assert client.get(f"{RECURRING_URL}/{created['id']}").status_code == 404


def test_get_missing_returns_404(client):
    assert client.get(f"{RECURRING_URL}/999").status_code == 404


def test_invalid_frequency_rejected(client):
    assert client.post(RECURRING_URL, json=_rule(frequency="hourly")).status_code == 422


def test_generate_materializes_transactions(client):
    start = (date.today() - timedelta(days=3)).isoformat()
    client.post(RECURRING_URL, json=_rule(frequency="daily", start_date=start))

    result = client.post(f"{RECURRING_URL}/generate")
    assert result.status_code == 200
    assert result.json()["created"] == 4  # day -3, -2, -1, and today

    txns = client.get(TRANSACTIONS_URL).json()
    assert len(txns) == 4
    assert all(t["recurring_id"] is not None for t in txns)

    # Running again creates nothing new.
    assert client.post(f"{RECURRING_URL}/generate").json()["created"] == 0


def test_delete_unlinks_generated_transactions(client):
    start = (date.today() - timedelta(days=1)).isoformat()
    created = client.post(RECURRING_URL, json=_rule(frequency="daily", start_date=start)).json()
    client.post(f"{RECURRING_URL}/generate")

    client.delete(f"{RECURRING_URL}/{created['id']}")
    txns = client.get(TRANSACTIONS_URL).json()
    assert len(txns) == 2  # generated transactions remain
    assert all(t["recurring_id"] is None for t in txns)  # but are unlinked
