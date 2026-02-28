"""
Search repository — aggregation pipelines for geo-aware product search.
Uses $geoNear + $lookup to join products with shops and compute distance.
"""

import re
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)


class SearchRepository:
    """Aggregation-based search across shops and products."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.shops = db["shops"]
        self.products = db["products"]

    async def search_products_nearby(
        self,
        query: str,
        lng: float,
        lat: float,
        radius_km: float = 10.0,
        limit: int = 50,
    ) -> List[dict]:
        """
        Search products by name near a location.

        Pipeline:
        1. $geoNear on shops → find shops within radius, get distance
        2. $lookup → join products by shop_id
        3. $unwind → flatten products
        4. $match → text filter on product name (regex for flexibility)
        5. $sort → by distance ascending
        6. $project → return product, shop summary, price, distance_km
        """
        radius_metres = radius_km * 1000

        pipeline = [
            # Stage 1: Find nearby active shops with distance
            {
                "$geoNear": {
                    "near": {"type": "Point", "coordinates": [lng, lat]},
                    "distanceField": "distance_metres",
                    "maxDistance": radius_metres,
                    "query": {"is_active": True},
                    "spherical": True,
                }
            },
            # Stage 2: Join products belonging to each shop
            {
                "$lookup": {
                    "from": "products",
                    "let": {"shop_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {"$eq": ["$shop_id", "$$shop_id"]},
                            }
                        }
                    ],
                    "as": "products",
                }
            },
            # Stage 3: Flatten — one document per product
            {"$unwind": "$products"},
            # Stage 4: Filter by product name (case-insensitive regex)
            {
                "$match": {
                    "products.name": {"$regex": re.escape(query), "$options": "i"},
                }
            },
            # Stage 5: Sort by distance ascending
            {"$sort": {"distance_metres": 1}},
            # Stage 6: Limit results
            {"$limit": limit},
            # Stage 7: Project clean output
            {
                "$project": {
                    "_id": 0,
                    "product": {
                        "_id": {"$toString": "$products._id"},
                        "name": "$products.name",
                        "description": "$products.description",
                        "category": "$products.category",
                        "images": "$products.images",
                        "current_price": "$products.current_price",
                        "stock_quantity": "$products.stock_quantity",
                    },
                    "shop": {
                        "_id": {"$toString": "$_id"},
                        "name": "$name",
                        "category": "$category",
                        "address": "$address",
                    },
                    "price": "$products.current_price",
                    "distance_km": {
                        "$round": [{"$divide": ["$distance_metres", 1000]}, 2]
                    },
                }
            },
        ]

        cursor = self.shops.aggregate(pipeline)
        results = []
        async for doc in cursor:
            results.append(doc)

        logger.info(
            "Geo product search: q='%s' [%.4f, %.4f] radius=%.1fkm → %d results",
            query, lng, lat, radius_km, len(results),
        )
        return results
