from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import create_access_token, require_auth, verify_credentials
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    if not verify_credentials(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    return TokenResponse(access_token=create_access_token(payload.username))


@router.get("/me")
def me(subject: Annotated[str, Depends(require_auth)]) -> dict[str, str]:
    """Echo the authenticated user — lets the SPA validate a stored token on load."""
    return {"username": subject}
