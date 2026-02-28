"""
Search service — orchestrates location-based product search.
"""

from app.core.logging import get_logger
from app.repositories.search_repository import SearchRepository

logger = get_logger(__name__)


class SearchService:
    """Business logic for geo-aware product search."""

    def __init__(self, search_repo: SearchRepository):
        self.search_repo = search_repo

    async def search_products_nearby(
        self,
        query: str,
        lat: float,
        lng: float,
        radius_km: float = 10.0,
        limit: int = 50,
    ) -> list:
        """
        Find products matching `query` in shops near the given coordinates.
        Returns results sorted by distance ascending.
        """
        logger.info(
            "Product search: q='%s' lat=%.4f lng=%.4f radius=%.1fkm",
            query, lat, lng, radius_km,
        )
        return await self.search_repo.search_products_nearby(
            query=query, lng=lng, lat=lat, radius_km=radius_km, limit=limit,
        )
