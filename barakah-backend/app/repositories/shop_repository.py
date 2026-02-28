"""
Shop repository — all MongoDB operations for the shops collection.
Supports CRUD, owner-based queries, and geospatial nearby search.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

# Collection name
_COLLECTION = "shops"


class ShopRepository:
    """Data-access layer for the *shops* collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, shop_data: dict) -> dict:
        """
        Insert a new shop document.
        Automatically sets timestamps and defaults.
        """
        now = datetime.now(timezone.utc)
        shop_data.update(
            {
                "rating_average": shop_data.get("rating_average", 0.0),
                "total_reviews": shop_data.get("total_reviews", 0),
                "is_active": shop_data.get("is_active", True),
                "created_at": now,
                "updated_at": now,
            }
        )

        result = await self.collection.insert_one(shop_data)
        shop_data["_id"] = str(result.inserted_id)
        logger.info("Shop created: %s — '%s'", shop_data["_id"], shop_data.get("name"))
        return shop_data

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_id(self, shop_id: str) -> Optional[dict]:
        """Look up a shop by its ObjectId string."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(shop_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as exc:
            logger.error("find_by_id failed for shop %s: %s", shop_id, exc)
            return None

    async def find_by_owner(self, owner_id: str) -> List[dict]:
        """Return all shops owned by a specific user."""
        cursor = self.collection.find({"owner_id": owner_id})
        shops = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            shops.append(doc)
        logger.debug("Found %d shops for owner %s", len(shops), owner_id)
        return shops

    async def find_nearby(
        self,
        lng: float,
        lat: float,
        radius_km: float,
        limit: int = 50,
    ) -> List[dict]:
        """
        Find active shops within `radius_km` of the given point.
        Uses MongoDB $nearSphere with $maxDistance in metres.
        """
        radius_metres = radius_km * 1000
        query = {
            "is_active": True,
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat],
                    },
                    "$maxDistance": radius_metres,
                },
            },
        }

        cursor = self.collection.find(query).limit(limit)
        shops = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            shops.append(doc)

        logger.info(
            "Nearby search: [%.4f, %.4f] radius=%.1fkm → %d results",
            lng, lat, radius_km, len(shops),
        )
        return shops

    # ── Updaters ─────────────────────────────────────────────────────────

    async def update_by_id(self, shop_id: str, update_fields: dict) -> bool:
        """Update specific fields on a shop document. Returns True on success."""
        update_fields["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"_id": ObjectId(shop_id)},
            {"$set": update_fields},
        )
        success = result.modified_count > 0
        if success:
            logger.debug("Shop %s updated fields: %s", shop_id, list(update_fields.keys()))
        return success

    # ── Index setup (called once at startup) ─────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on the shops collection."""
        # Geospatial index for nearby queries
        await self.collection.create_index([("location", "2dsphere")])
        # Owner lookup
        await self.collection.create_index("owner_id")
        # Category + active compound for filtered searches
        await self.collection.create_index([("category", 1), ("is_active", 1)])
        logger.info("Shops collection indexes ensured.")
