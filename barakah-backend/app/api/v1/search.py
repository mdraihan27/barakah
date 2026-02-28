"""
Search routes — /api/v1/search/* endpoints.
Location-aware product search using MongoDB aggregation.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_db
from app.core.logging import get_logger
from app.repositories.search_repository import SearchRepository
from app.services.search_service import SearchService

logger = get_logger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _search_service(db=Depends(get_db)) -> SearchService:
    return SearchService(SearchRepository(db))


# ── Response schema (inline — aggregation results are dynamic) ──────────────

from pydantic import BaseModel, Field


class ProductSearchResult(BaseModel):
    """Single result from a geo product search."""
    product: Dict[str, Any]
    shop: Dict[str, Any]
    price: float
    distance_km: float


class ProductSearchResponse(BaseModel):
    """List of geo-search results."""
    results: List[ProductSearchResult]
    total: int


# =============================================================================
# Geo Product Search (public)
# =============================================================================

@router.get(
    "/products",
    response_model=ProductSearchResponse,
    summary="Search products near a location",
)
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(10.0, gt=0, le=100, description="Search radius in km"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    service: SearchService = Depends(_search_service),
):
    """
    Search products by name near a geographic point.
    Returns products with shop info and distance, sorted by proximity.
    Public endpoint.
    """
    logger.info("GET /search/products — q='%s' lat=%.4f lng=%.4f", q, lat, lng)
    results = await service.search_products_nearby(
        query=q, lat=lat, lng=lng, radius_km=radius_km, limit=limit,
    )
    return ProductSearchResponse(
        results=[ProductSearchResult(**r) for r in results],
        total=len(results),
    )
