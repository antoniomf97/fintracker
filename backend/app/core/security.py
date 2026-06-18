"""Single-user authentication: password verification and JWT issue/verify.

The app has one set of credentials (from settings). Login checks them and mints a
signed JWT; protected routes depend on ``require_auth`` to validate the bearer token.
Settings are read at call time so tests can monkeypatch them.
"""

import datetime
import secrets
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

# auto_error=False so a missing/blank header yields our own 401 (HTTPBearer's default
# is 403); the frontend triggers logout specifically on 401.
_bearer = HTTPBearer(auto_error=False)


def verify_credentials(username: str, password: str) -> bool:
    """True if the username and password match the configured single user."""
    username_ok = secrets.compare_digest(username, settings.AUTH_USERNAME)
    password_ok = bcrypt.checkpw(password.encode(), settings.AUTH_PASSWORD_HASH.encode())
    # Check both regardless of the username result to keep timing uniform.
    return username_ok and password_ok


def create_access_token(subject: str) -> str:
    """Sign a JWT for ``subject`` that expires after the configured window."""
    now = datetime.datetime.now(datetime.UTC)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Validate the bearer token and return its subject, or raise 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError as exc:
        raise unauthorized from exc
    subject = payload.get("sub")
    if not subject:
        raise unauthorized
    return subject
