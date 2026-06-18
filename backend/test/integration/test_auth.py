import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import models  # noqa: F401  (registers tables on Base.metadata)

LOGIN_URL = f"{settings.API_PREFIX}/auth/login"
ME_URL = f"{settings.API_PREFIX}/auth/me"
PROTECTED_URL = f"{settings.API_PREFIX}/transactions"


@pytest.fixture
def client():
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

    # require_auth is intentionally NOT overridden here — these tests exercise real auth.
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def creds(monkeypatch):
    """Set known single-user credentials so login is deterministic regardless of .env."""
    password = "s3cret-pw"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    monkeypatch.setattr(settings, "AUTH_USERNAME", "tester")
    monkeypatch.setattr(settings, "AUTH_PASSWORD_HASH", hashed)
    monkeypatch.setattr(settings, "JWT_SECRET", "test-secret-test-secret-test-secret")
    return {"username": "tester", "password": password}


def _token(client, creds) -> str:
    return client.post(LOGIN_URL, json=creds).json()["access_token"]


def test_login_returns_a_token(client, creds):
    response = client.post(LOGIN_URL, json=creds)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_rejects_wrong_password(client, creds):
    response = client.post(LOGIN_URL, json={"username": "tester", "password": "nope"})
    assert response.status_code == 401


def test_login_rejects_unknown_user(client, creds):
    response = client.post(LOGIN_URL, json={"username": "intruder", "password": creds["password"]})
    assert response.status_code == 401


def test_protected_route_requires_a_token(client):
    assert client.get(PROTECTED_URL).status_code == 401


def test_invalid_token_is_rejected(client):
    response = client.get(PROTECTED_URL, headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


def test_protected_route_accepts_a_valid_token(client, creds):
    token = _token(client, creds)
    response = client.get(PROTECTED_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []


def test_me_returns_the_authenticated_user(client, creds):
    token = _token(client, creds)
    response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"username": "tester"}
