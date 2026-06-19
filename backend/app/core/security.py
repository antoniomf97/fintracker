"""Authentication: password hashing and JWT issue/verify.

Accounts live in the database. Signup hashes the password; login verifies it and mints
a JWT whose subject is the user's id. Protected routes depend on ``get_current_user`` to
resolve the bearer token to a ``User``. Settings are read at call time so tests can
monkeypatch them.
"""

import datetime
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.models import User

# auto_error=False so a missing/blank header yields our own 401 (HTTPBearer's default
# is 403); the frontend triggers logout specifically on 401.
_bearer = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str) -> str:
    """Sign a JWT for ``subject`` (the user id) that expires after the configured window."""
    now = datetime.datetime.now(datetime.UTC)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve the bearer token to the current ``User``, or raise 401."""
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
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise unauthorized from exc
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user
