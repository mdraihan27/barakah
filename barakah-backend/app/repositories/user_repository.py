"""
User repository — all MongoDB operations for the users collection.
Keeps database logic out of the service / route layers.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

# Collection name
_COLLECTION = "users"


class UserRepository:
    """Data-access layer for the *users* collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_id(self, user_id: str) -> Optional[dict]:
        """Look up a user by their ObjectId string."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(user_id)})
            if doc:
                doc["_id"] = str(doc["_id"])  # stringify for serialisation
            return doc
        except Exception as exc:
            logger.error("find_by_id failed for %s: %s", user_id, exc)
            return None

    async def find_by_email(self, email: str) -> Optional[dict]:
        """Look up a user by email (case-insensitive)."""
        doc = await self.collection.find_one({"email": email.lower()})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, user_data: dict) -> dict:
        """
        Insert a new user document.
        Automatically sets timestamps and normalises the email.
        """
        now = datetime.now(timezone.utc)
        user_data["email"] = user_data.get("email", "").lower()
        user_data.update(
            {
                "is_email_verified": user_data.get("is_email_verified", False),
                "is_active": True,
                "auth_provider": user_data.get("auth_provider", "local"),
                "role": user_data.get("role", "user"),
                "avatar_url": user_data.get("avatar_url"),
                "verification_code": None,
                "verification_code_expires_at": None,
                "reset_code": None,
                "reset_code_expires_at": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        result = await self.collection.insert_one(user_data)
        user_data["_id"] = str(result.inserted_id)
        logger.info("User created: %s (%s)", user_data["_id"], user_data["email"])
        return user_data

    # ── Updaters ─────────────────────────────────────────────────────────

    async def update_by_id(self, user_id: str, update_fields: dict) -> bool:
        """Update specific fields on a user document. Returns True on success."""
        update_fields["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
        )
        success = result.modified_count > 0
        if success:
            logger.debug("User %s updated fields: %s", user_id, list(update_fields.keys()))
        return success

    async def set_verification_code(
        self, user_id: str, code: str, expires_at: datetime
    ) -> bool:
        """Store a verification code and its expiry on the user document."""
        return await self.update_by_id(
            user_id,
            {"verification_code": code, "verification_code_expires_at": expires_at},
        )

    async def clear_verification_code(self, user_id: str) -> bool:
        """Remove the verification code after successful verification."""
        return await self.update_by_id(
            user_id,
            {
                "verification_code": None,
                "verification_code_expires_at": None,
                "is_email_verified": True,
            },
        )

    async def set_reset_code(self, user_id: str, code: str, expires_at: datetime) -> bool:
        """Store a password-reset code and its expiry."""
        return await self.update_by_id(
            user_id,
            {"reset_code": code, "reset_code_expires_at": expires_at},
        )

    async def clear_reset_code_and_set_password(
        self, user_id: str, hashed_password: str
    ) -> bool:
        """Clear the reset code and update the password in one operation."""
        return await self.update_by_id(
            user_id,
            {
                "reset_code": None,
                "reset_code_expires_at": None,
                "hashed_password": hashed_password,
            },
        )

    # ── Index setup (called once at startup) ─────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on the users collection."""
        await self.collection.create_index("email", unique=True)
        logger.info("Users collection indexes ensured.")
