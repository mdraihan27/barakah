"""
Authentication service — orchestrates business logic for all auth flows.
Sits between routes (HTTP layer) and repositories (DB layer).
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.logging import get_logger
from app.repositories.user_repository import UserRepository
from app.services.email_service import send_password_reset_email, send_verification_email
from app.utils.security import (
    create_token_pair,
    generate_verification_code,
    hash_password,
    verify_password,
)

logger = get_logger(__name__)


class AuthService:
    """Encapsulates every authentication workflow."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
        self.settings = get_settings()

    # ─── Signup ──────────────────────────────────────────────────────────

    async def signup(self, first_name: str, last_name: str, email: str, password: str, is_shop_owner: bool = False) -> dict:
        """
        Register a new local user.
        Returns the user document + token pair.
        """
        email = email.lower().strip()
        logger.info("Signup attempt: %s", email)

        # Check for existing account
        existing = await self.user_repo.find_by_email(email)
        if existing:
            logger.warning("Signup rejected — email already registered: %s", email)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Create user
        role = "shop_owner" if is_shop_owner else "user"
        user = await self.user_repo.create(
            {
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "email": email,
                "hashed_password": hash_password(password),
                "auth_provider": "local",
                "role": role,
            }
        )

        tokens = create_token_pair(user["_id"])
        logger.info("Signup successful: %s", email)
        return {"user": user, "tokens": tokens}

    # ─── Login ───────────────────────────────────────────────────────────

    async def login(self, email: str, password: str) -> dict:
        """
        Authenticate with email + password.
        Returns the user document + token pair.
        """
        email = email.lower().strip()
        logger.info("Login attempt: %s", email)

        user = await self.user_repo.find_by_email(email)
        if not user:
            logger.warning("Login failed — unknown email: %s", email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Google-only accounts don't have a password
        if user.get("auth_provider") == "google" and not user.get("hashed_password"):
            logger.warning("Login attempt on Google-only account: %s", email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google sign-in. Please log in with Google.",
            )

        if not verify_password(password, user.get("hashed_password", "")):
            logger.warning("Login failed — wrong password: %s", email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.get("is_active", True):
            logger.warning("Login attempt on deactivated account: %s", email)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated.",
            )

        tokens = create_token_pair(user["_id"])
        logger.info("Login successful: %s", email)
        return {"user": user, "tokens": tokens}

    # ─── Email verification: send code ───────────────────────────────────

    async def send_verification_code(self, email: str) -> None:
        """Generate a 6-digit code, persist it, and email it to the user."""
        email = email.lower().strip()
        logger.info("Verification code requested for: %s", email)

        user = await self.user_repo.find_by_email(email)
        if not user:
            logger.warning("Verification code request for unknown email: %s", email)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.get("is_email_verified"):
            logger.info("Email already verified: %s", email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified.",
            )

        code = generate_verification_code()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.VERIFICATION_CODE_EXPIRE_MINUTES
        )
        await self.user_repo.set_verification_code(user["_id"], code, expires_at)

        # Fire-and-forget email (logged on failure inside the service)
        await send_verification_email(email, code, user["first_name"])
        logger.info("Verification code sent to: %s", email)

    # ─── Email verification: verify code ─────────────────────────────────

    async def verify_email(self, email: str, code: str) -> None:
        """Validate the verification code and mark the email as verified."""
        email = email.lower().strip()
        logger.info("Email verification attempt: %s", email)

        user = await self.user_repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.get("is_email_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified.",
            )

        self._validate_code(
            stored_code=user.get("verification_code"),
            submitted_code=code,
            expires_at=user.get("verification_code_expires_at"),
            label="Verification",
        )

        await self.user_repo.clear_verification_code(user["_id"])
        logger.info("Email verified: %s", email)

    # ─── Forgot password: send code ──────────────────────────────────────

    async def send_reset_code(self, email: str) -> None:
        """Generate a reset code, persist it, and email it to the user."""
        email = email.lower().strip()
        logger.info("Password reset requested for: %s", email)

        user = await self.user_repo.find_by_email(email)
        if not user:
            # For security, don't reveal whether the email exists
            logger.warning("Reset code request for unknown email: %s", email)
            return  # silently succeed

        code = generate_verification_code()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.RESET_CODE_EXPIRE_MINUTES
        )
        await self.user_repo.set_reset_code(user["_id"], code, expires_at)
        await send_password_reset_email(email, code, user["first_name"])
        logger.info("Reset code sent to: %s", email)

    # ─── Reset password: verify code + update password ───────────────────

    async def reset_password(self, email: str, code: str, new_password: str) -> None:
        """Validate the reset code and set a new password."""
        email = email.lower().strip()
        logger.info("Password reset attempt: %s", email)

        user = await self.user_repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        self._validate_code(
            stored_code=user.get("reset_code"),
            submitted_code=code,
            expires_at=user.get("reset_code_expires_at"),
            label="Reset",
        )

        hashed = hash_password(new_password)
        await self.user_repo.clear_reset_code_and_set_password(user["_id"], hashed)
        logger.info("Password reset successful: %s", email)

    # ─── Google OAuth: upsert user ───────────────────────────────────────

    async def google_authenticate(self, google_user_info: dict) -> dict:
        """
        Create or update a user from Google profile data.
        Returns user + tokens.
        """
        email = google_user_info["email"].lower().strip()
        logger.info("Google auth for: %s", email)

        user = await self.user_repo.find_by_email(email)

        if user:
            # Update avatar / name if changed
            await self.user_repo.update_by_id(
                user["_id"],
                {
                    "avatar_url": google_user_info.get("picture"),
                    "first_name": google_user_info.get("given_name", user["first_name"]),
                    "last_name": google_user_info.get("family_name", user["last_name"]),
                    "is_email_verified": True,  # Google guarantees email ownership
                },
            )
            user = await self.user_repo.find_by_id(user["_id"])
        else:
            # First-time Google sign-in — create the account
            user = await self.user_repo.create(
                {
                    "first_name": google_user_info.get("given_name", ""),
                    "last_name": google_user_info.get("family_name", ""),
                    "email": email,
                    "hashed_password": None,  # no password for Google-only accounts
                    "auth_provider": "google",
                    "is_email_verified": True,
                    "avatar_url": google_user_info.get("picture"),
                }
            )

        tokens = create_token_pair(user["_id"])
        logger.info("Google auth successful: %s", email)
        return {"user": user, "tokens": tokens}

    # ─── Internal helper ─────────────────────────────────────────────────

    @staticmethod
    def _validate_code(
        stored_code: str | None,
        submitted_code: str,
        expires_at: datetime | None,
        label: str,
    ) -> None:
        """
        Shared validation for verification & reset codes.
        Raises HTTPException on mismatch or expiry.
        """
        if not stored_code or stored_code != submitted_code:
            logger.warning("%s code mismatch or missing", label)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {label.lower()} code.",
            )

        if expires_at and datetime.now(timezone.utc) > expires_at:
            logger.warning("%s code expired", label)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{label} code has expired. Please request a new one.",
            )
