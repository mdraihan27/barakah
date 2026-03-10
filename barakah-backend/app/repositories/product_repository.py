"""
Product repository — all MongoDB operations for the products and price_history collections.
Supports CRUD, shop-based queries, text search, and price history tracking.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

_COLLECTION = "products"
_PRICE_HISTORY_COLLECTION = "price_history"


class ProductRepository:
    """Data-access layer for the *products* and *price_history* collections."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]
        self.price_history = db[_PRICE_HISTORY_COLLECTION]

    # ── Creators ─────────────────────────────────────────────────────────

    async def create(self, product_data: dict) -> dict:
        """Insert a new product document with timestamps."""
        now = datetime.now(timezone.utc)
        product_data.update({"created_at": now, "updated_at": now})

        result = await self.collection.insert_one(product_data)
        product_data["_id"] = str(result.inserted_id)
        logger.info("Product created: %s — '%s'", product_data["_id"], product_data.get("name"))
        return product_data

    # ── Finders ──────────────────────────────────────────────────────────

    async def find_by_id(self, product_id: str) -> Optional[dict]:
        """Look up a product by its ObjectId string."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(product_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as exc:
            logger.error("find_by_id failed for product %s: %s", product_id, exc)
            return None

    async def find_by_shop(self, shop_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        """Return products belonging to a specific shop."""
        cursor = self.collection.find({"shop_id": shop_id}).skip(skip).limit(limit)
        products = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            products.append(doc)
        logger.debug("Found %d products for shop %s", len(products), shop_id)
        return products

    async def count_by_shop(self, shop_id: str) -> int:
        """Count products in a shop."""
        return await self.collection.count_documents({"shop_id": shop_id})

    async def get_recent_by_shops(self, shop_ids: List[str], limit: int = 20) -> List[dict]:
        """Fetch the most recently created products from a list of shops."""
        cursor = (
            self.collection.find({"shop_id": {"$in": shop_ids}})
            .sort("created_at", -1)
            .limit(limit)
        )
        products = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            products.append(doc)
        logger.debug("Found %d recent products across %d shops", len(products), len(shop_ids))
        return products

    async def search_by_name(self, query: str, limit: int = 50) -> List[dict]:
        """
        Full-text search on product name using MongoDB text index.
        Results are sorted by text relevance score.
        """
        cursor = (
            self.collection.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}},
            )
            .sort([("score", {"$meta": "textScore"})])
            .limit(limit)
        )
        products = []
        async for doc in cursor:
            doc.pop("score", None)
            doc["_id"] = str(doc["_id"])
            products.append(doc)
        logger.info("Text search '%s' → %d results", query, len(products))
        return products

    # ── Updaters ─────────────────────────────────────────────────────────

    async def update_by_id(self, product_id: str, update_fields: dict) -> bool:
        """Update specific fields on a product. Returns True on success."""
        update_fields["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_fields},
        )
        success = result.modified_count > 0
        if success:
            logger.debug("Product %s updated: %s", product_id, list(update_fields.keys()))
        return success

    # ── Price History ────────────────────────────────────────────────────

    async def add_price_record(self, product_id: str, price: float) -> None:
        """
        Insert a price snapshot into the price_history collection
        and update the product's current_price.
        """
        now = datetime.now(timezone.utc)

        # Record in history
        await self.price_history.insert_one({
            "product_id": product_id,
            "price": price,
            "recorded_at": now,
        })

        # Update current price on the product document
        await self.update_by_id(product_id, {"current_price": price})
        logger.info("Price updated for product %s: %.2f", product_id, price)

    async def get_price_history(
        self, product_id: str, limit: int = 50
    ) -> List[dict]:
        """Retrieve price history for a product, newest first."""
        cursor = (
            self.price_history.find({"product_id": product_id})
            .sort("recorded_at", -1)
            .limit(limit)
        )
        history = []
        async for doc in cursor:
            doc.pop("_id", None)
            history.append(doc)
        return history

    # ── Indexes ──────────────────────────────────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on products and price_history collections."""
        await self.collection.create_index("shop_id")
        await self.collection.create_index("category")
        await self.collection.create_index([("name", "text"), ("description", "text")])
        await self.price_history.create_index([("product_id", 1), ("recorded_at", -1)])
        logger.info("Products + price_history collection indexes ensured.")
