import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import models  # noqa: F401  (registers tables on Base.metadata)

SIGNUP_URL = f"{settings.API_PREFIX}/auth/signup"
LOGIN_URL = f"{settings.API_PREFIX}/auth/login"
ME_URL = f"{settings.API_PREFIX}/auth/me"
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

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    # No get_current_user override — these tests exercise real auth end to end.
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _signup(client, username="alice", password="password123"):
    return client.post(SIGNUP_URL, json={"username": username, "password": password})


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_signup_returns_a_token(client):
    response = _signup(client)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_signup_rejects_duplicate_username(client):
    _signup(client)
    assert _signup(client).status_code == 409


def test_signup_rejects_short_password(client):
    response = client.post(SIGNUP_URL, json={"username": "bob", "password": "short"})
    assert response.status_code == 422


def test_signup_rejects_password_over_72_bytes(client):
    response = _signup(client, "bob", "x" * 80)
    assert response.status_code == 422


def test_signup_rejects_password_over_72_bytes_multibyte(client):
    # 45 chars but 90 bytes in UTF-8 — the limit is bytes, not characters.
    response = _signup(client, "bob", "é" * 45)
    assert response.status_code == 422


def test_login_with_over_long_password_is_401_not_500(client):
    _signup(client, "frank")
    response = client.post(LOGIN_URL, json={"username": "frank", "password": "x" * 80})
    assert response.status_code == 401


def test_login_after_signup(client):
    _signup(client, "carol")
    response = client.post(LOGIN_URL, json={"username": "carol", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_rejects_wrong_password(client):
    _signup(client, "dave")
    response = client.post(LOGIN_URL, json={"username": "dave", "password": "nope"})
    assert response.status_code == 401


def test_login_rejects_unknown_user(client):
    response = client.post(LOGIN_URL, json={"username": "ghost", "password": "password123"})
    assert response.status_code == 401


def test_protected_route_requires_a_token(client):
    assert client.get(TRANSACTIONS_URL).status_code == 401


def test_me_returns_the_current_user(client):
    token = _signup(client, "erin").json()["access_token"]
    response = client.get(ME_URL, headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["username"] == "erin"


def test_users_only_see_their_own_data(client):
    a = _signup(client, "user-a").json()["access_token"]
    b = _signup(client, "user-b").json()["access_token"]

    created = client.post(
        TRANSACTIONS_URL,
        json={"date": "2026-06-08", "type": "income", "category": "salary", "amount": 1000},
        headers=_auth(a),
    )
    assert created.status_code == 201

    # B sees nothing; A sees their own row.
    assert client.get(TRANSACTIONS_URL, headers=_auth(b)).json() == []
    a_rows = client.get(TRANSACTIONS_URL, headers=_auth(a)).json()
    assert [t["category"] for t in a_rows] == ["salary"]

    # B can't fetch A's transaction by id either.
    tx_id = created.json()["id"]
    assert client.get(f"{TRANSACTIONS_URL}/{tx_id}", headers=_auth(b)).status_code == 404
