from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.models import User
from app.schemas.auth import (
    BCRYPT_MAX_PASSWORD_BYTES,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: DbSession) -> TokenResponse:
    username = payload.username.strip()
    if db.query(User).filter_by(username=username).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
    user = User(username=username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    # Auto-login: hand back a token so the new account is signed in immediately.
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.query(User).filter_by(username=payload.username.strip()).first()
    # No stored password exceeds bcrypt's 72-byte limit (signup rejects them), so an
    # over-long password is simply wrong — 401, not a validation error that would
    # leak policy detail. Checked first because bcrypt 5 raises on longer input.
    password_too_long = len(payload.password.encode()) > BCRYPT_MAX_PASSWORD_BYTES
    bad_password = (
        password_too_long
        or user is None
        or not verify_password(payload.password, user.password_hash)
    )
    if bad_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
