"""
Security utilities — password hashing, JWT creation & verification.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Password hashing context (bcrypt) ───────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against a stored hash."""
    return _pwd_context.verify(plain, hashed)


# ── JWT helpers ──────────────────────────────────────────────────────────────

def create_access_token(user_id: str, extra_claims: Optional[dict] = None) -> str:
    """Generate a short-lived access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {"sub": user_id, "exp": expire, "type": "access"}
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    logger.debug("Access token created for user %s", user_id)
    return token


def create_refresh_token(user_id: str) -> str:
    """Generate a long-lived refresh token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    logger.debug("Refresh token created for user %s", user_id)
    return token


def create_token_pair(user_id: str) -> dict:
    """Return both access and refresh tokens as a dict."""
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
    }


def decode_access_token(token: str) -> dict:
    """
    Decode and validate an access token.
    Raises HTTP 401 on any failure.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Not an access token")
        return payload
    except JWTError as exc:
        logger.warning("Invalid access token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a refresh token.
    Raises HTTP 401 on any failure.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise JWTError("Not a refresh token")
        return payload
    except JWTError as exc:
        logger.warning("Invalid refresh token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )


# ── Verification / Reset code generation ────────────────────────────────────

def generate_verification_code(length: int = 6) -> str:
    """Generate a cryptographically secure numeric code."""
    return "".join(secrets.choice("0123456789") for _ in range(length))
