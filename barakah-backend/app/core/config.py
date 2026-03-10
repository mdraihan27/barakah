"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from functools import lru_cache
import json
from typing import Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — every field maps to an env var."""

    # ── App ──────────────────────────────────────────────────────────────
    APP_NAME: str = "Barakah"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Server ───────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── MongoDB ──────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "barakah_db"

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Google OAuth ─────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    REDIRECT_DASHBOARD_URL: str = "http://localhost:3000/dashboard"
    REDIRECT_LOGIN_URL: str = "http://localhost:3000/login"
    # ── SMTP / Email ─────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "Barakah"
    EMAIL_FROM_ADDRESS: str = "noreply@barakah.com"

    # ── Verification / Reset ─────────────────────────────────────────────
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    RESET_CODE_EXPIRE_MINUTES: int = 15

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://barakah-platform.vercel.app",
    ]
    CORS_ORIGIN_REGEX: str | None = None

    # ── Uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> List[str] | Any:
        """
        Accept both JSON-array and comma-separated env formats.
        This is useful for platforms where list env vars are injected as plain strings.
        """
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []

            if text.startswith("["):
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    parsed = []
                if isinstance(parsed, list):
                    return parsed

            return [item.strip() for item in text.split(",") if item.strip()]

        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def normalize_cors_origins(cls, value: List[str]) -> List[str]:
        # Normalize trailing slashes to avoid origin string mismatches.
        return [origin.strip().rstrip("/") for origin in value if origin and origin.strip()]

    @field_validator("CORS_ORIGIN_REGEX", mode="before")
    @classmethod
    def normalize_cors_origin_regex(cls, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            cleaned = value.strip()
            return cleaned or None
        return None


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton so the .env file is read only once."""
    return Settings()
