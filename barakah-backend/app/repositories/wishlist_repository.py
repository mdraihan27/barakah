"""
Wishlist repository — all MongoDB operations for the wishlist_items collection.
Uses product_name instead of product_id for cross-shop matching.
"""

import re
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

_COLLECTION = "wishlist_items"


class WishlistRepository:
    """Data-access layer for the *wishlist_items* collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, item_data: dict) -> dict:
        """Insert a new wishlist item."""
        item_data["created_at"] = datetime.now(timezone.utc)

        result = await self.collection.insert_one(item_data)
        item_data["_id"] = str(result.inserted_id)
        logger.info(
            "Wishlist item created: %s (user %s, product '%s')",
            item_data["_id"], item_data["user_id"], item_data["product_name"],
        )
        return item_data

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_id(self, item_id: str) -> Optional[dict]:
        """Find a wishlist item by its ObjectId."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(item_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as exc:
            logger.error("find_by_id failed for wishlist item %s: %s", item_id, exc)
            return None

    async def find_by_user(self, user_id: str) -> List[dict]:
        """Get all wishlist items for a user."""
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items

    async def find_by_user_and_product(self, user_id: str, product_name: str) -> Optional[dict]:
        """Check if a user already has a specific product name in their wishlist."""
        doc = await self.collection.find_one({
            "user_id": user_id,
            "product_name": {"$regex": f"^{re.escape(product_name)}$", "$options": "i"},
        })
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def find_all_with_target_price(self) -> List[dict]:
        """Get all wishlist items that have a target price set (for monitoring jobs)."""
        cursor = self.collection.find({"target_price": {"$ne": None}})
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items

    # ── Deleters ─────────────────────────────────────────────────────────

    async def delete_by_id(self, item_id: str) -> bool:
        """Delete a wishlist item. Returns True on success."""
        result = await self.collection.delete_one({"_id": ObjectId(item_id)})
        return result.deleted_count > 0

    # ── Indexes ──────────────────────────────────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on the wishlist_items collection."""
        await self.collection.create_index("user_id")
        await self.collection.create_index("product_name")
        await self.collection.create_index(
            [("user_id", 1), ("product_name", 1)], unique=True
        )
        logger.info("Wishlist_items collection indexes ensured.")
