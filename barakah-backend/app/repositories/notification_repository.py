"""
Notification repository — all MongoDB operations for the notifications collection.
Supports creation, listing, read status, and unread counts.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

_COLLECTION = "notifications"


class NotificationRepository:
    """Data-access layer for the *notifications* collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, notification_data: dict) -> dict:
        """Insert a new notification."""
        notification_data.setdefault("is_read", False)
        notification_data["created_at"] = datetime.now(timezone.utc)

        result = await self.collection.insert_one(notification_data)
        notification_data["_id"] = str(result.inserted_id)
        logger.info(
            "Notification created: %s for user %s — type '%s'",
            notification_data["_id"],
            notification_data["user_id"],
            notification_data.get("type"),
        )
        return notification_data

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_user(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[dict]:
        """Get notifications for a user, newest first."""
        cursor = (
            self.collection.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        notifications = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            notifications.append(doc)
        return notifications

    async def count_unread(self, user_id: str) -> int:
        """Count unread notifications for a user."""
        return await self.collection.count_documents({
            "user_id": user_id,
            "is_read": False,
        })

    async def count_by_user(self, user_id: str) -> int:
        """Count total notifications for a user."""
        return await self.collection.count_documents({"user_id": user_id})

    # ── Updaters ─────────────────────────────────────────────────────────

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a single notification as read. Returns True on success."""
        result = await self.collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}},
        )
        return result.modified_count > 0

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user. Returns modified count."""
        result = await self.collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}},
        )
        logger.info("Marked %d notifications as read for user %s", result.modified_count, user_id)
        return result.modified_count

    # ── Indexes ──────────────────────────────────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on the notifications collection."""
        await self.collection.create_index([("user_id", 1), ("is_read", 1)])
        await self.collection.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("Notifications collection indexes ensured.")
