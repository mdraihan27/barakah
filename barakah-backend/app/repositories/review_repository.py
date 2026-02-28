"""
Review repository — all MongoDB operations for the reviews collection.
Supports CRUD, uniqueness enforcement, and rating aggregation.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

_COLLECTION = "reviews"


class ReviewRepository:
    """Data-access layer for the *reviews* collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, review_data: dict) -> dict:
        """Insert a new review document."""
        review_data["created_at"] = datetime.now(timezone.utc)

        result = await self.collection.insert_one(review_data)
        review_data["_id"] = str(result.inserted_id)
        logger.info(
            "Review created: %s (user %s → shop %s, rating %d)",
            review_data["_id"], review_data["user_id"],
            review_data["shop_id"], review_data["rating"],
        )
        return review_data

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_user_and_shop(self, user_id: str, shop_id: str) -> Optional[dict]:
        """Check if a user has already reviewed a specific shop."""
        doc = await self.collection.find_one({"user_id": user_id, "shop_id": shop_id})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def find_by_shop(self, shop_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get all reviews for a shop, newest first."""
        cursor = (
            self.collection.find({"shop_id": shop_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        reviews = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            reviews.append(doc)
        return reviews

    async def count_by_shop(self, shop_id: str) -> int:
        """Count reviews for a shop."""
        return await self.collection.count_documents({"shop_id": shop_id})

    # ── Rating Aggregation ───────────────────────────────────────────────

    async def calculate_shop_rating(self, shop_id: str) -> dict:
        """
        Calculate average rating and total reviews for a shop
        using MongoDB aggregation.
        Returns {"average": float, "count": int}.
        """
        pipeline = [
            {"$match": {"shop_id": shop_id}},
            {
                "$group": {
                    "_id": "$shop_id",
                    "average": {"$avg": "$rating"},
                    "count": {"$sum": 1},
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        result = None
        async for doc in cursor:
            result = doc

        if not result:
            return {"average": 0.0, "count": 0}

        return {
            "average": round(result["average"], 2),
            "count": result["count"],
        }

    # ── Deleters ─────────────────────────────────────────────────────────

    async def delete_by_id(self, review_id: str) -> bool:
        """Delete a review by its ObjectId. Returns True on success."""
        result = await self.collection.delete_one({"_id": ObjectId(review_id)})
        return result.deleted_count > 0

    # ── Indexes ──────────────────────────────────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on the reviews collection."""
        # One review per user per shop
        await self.collection.create_index(
            [("user_id", 1), ("shop_id", 1)], unique=True
        )
        await self.collection.create_index("shop_id")
        logger.info("Reviews collection indexes ensured.")
