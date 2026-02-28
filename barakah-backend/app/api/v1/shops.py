"""
Shop routes — all /api/v1/shops/* endpoints.
Thin controller layer: validates input, delegates to ShopService.
"""

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user, get_db, require_role
from app.core.logging import get_logger
from app.repositories.shop_repository import ShopRepository
from app.schemas.shop import (
    ShopCreateRequest,
    ShopListResponse,
    ShopResponse,
    ShopUpdateRequest,
)
from app.services.shop_service import ShopService

logger = get_logger(__name__)

router = APIRouter(prefix="/shops", tags=["Shops"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _shop_service(db=Depends(get_db)) -> ShopService:
    return ShopService(ShopRepository(db))


# =============================================================================
# Create Shop (shop_owner / admin only)
# =============================================================================

@router.post(
    "",
    response_model=ShopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new shop",
)
async def create_shop(
    body: ShopCreateRequest,
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ShopService = Depends(_shop_service),
):
    """Register a new shop. Requires shop_owner or admin role."""
    logger.info("POST /shops — user %s creating '%s'", current_user["_id"], body.name)
    shop = await service.create_shop(
        owner=current_user,
        data=body.model_dump(),
    )
    return ShopResponse(**shop)


# =============================================================================
# Update Shop (owner / admin only)
# =============================================================================

@router.patch(
    "/{shop_id}",
    response_model=ShopResponse,
    summary="Update an existing shop",
)
async def update_shop(
    shop_id: str,
    body: ShopUpdateRequest,
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ShopService = Depends(_shop_service),
):
    """Update shop details. Only the shop owner or an admin can modify."""
    logger.info("PATCH /shops/%s — user %s", shop_id, current_user["_id"])
    shop = await service.update_shop(
        shop_id=shop_id,
        owner=current_user,
        data=body.model_dump(exclude_unset=True),
    )
    return ShopResponse(**shop)


# =============================================================================
# Get Nearby Shops (public)
# =============================================================================

@router.get(
    "/nearby",
    response_model=ShopListResponse,
    summary="Find shops near a location",
)
async def get_nearby_shops(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(10.0, gt=0, le=100, description="Search radius in km"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    service: ShopService = Depends(_shop_service),
):
    """Find active shops within a radius of the given coordinates. Public endpoint."""
    logger.info("GET /shops/nearby — lat=%.4f lng=%.4f radius=%.1fkm", lat, lng, radius_km)
    shops = await service.get_nearby_shops(lat=lat, lng=lng, radius_km=radius_km, limit=limit)
    return ShopListResponse(shops=[ShopResponse(**s) for s in shops], total=len(shops))


# =============================================================================
# Get Single Shop (public)
# =============================================================================

@router.get(
    "/{shop_id}",
    response_model=ShopResponse,
    summary="Get shop details",
)
async def get_shop(
    shop_id: str,
    service: ShopService = Depends(_shop_service),
):
    """Fetch a shop by its ID. Public endpoint."""
    logger.info("GET /shops/%s", shop_id)
    shop = await service.get_shop(shop_id)
    return ShopResponse(**shop)


# =============================================================================
# Get My Shops (authenticated shop_owner)
# =============================================================================

@router.get(
    "",
    response_model=ShopListResponse,
    summary="List my shops",
)
async def get_my_shops(
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ShopService = Depends(_shop_service),
):
    """Return all shops owned by the authenticated user."""
    logger.info("GET /shops — owner %s", current_user["_id"])
    shops = await service.get_owner_shops(current_user["_id"])
    return ShopListResponse(shops=[ShopResponse(**s) for s in shops], total=len(shops))
