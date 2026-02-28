"""
Wishlist routes — /api/v1/wishlist/* endpoints.
All endpoints require authentication.
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.wishlist_repository import WishlistRepository
from app.schemas.wishlist import (
    WishlistItemCreateRequest,
    WishlistItemResponse,
    WishlistResponse,
)
from app.services.wishlist_service import WishlistService

logger = get_logger(__name__)

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _wishlist_service(db=Depends(get_db)) -> WishlistService:
    return WishlistService(WishlistRepository(db))


# =============================================================================
# Add to Wishlist
# =============================================================================

@router.post(
    "",
    response_model=WishlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add item to wishlist",
)
async def add_to_wishlist(
    body: WishlistItemCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: WishlistService = Depends(_wishlist_service),
):
    """Add a product to the user's wishlist by name (for cross-shop matching)."""
    logger.info("POST /wishlist — user %s, product '%s'", current_user["_id"], body.product_name)
    item = await service.add_item(user=current_user, data=body.model_dump())
    return WishlistItemResponse(**item)


# =============================================================================
# Remove from Wishlist
# =============================================================================

@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove item from wishlist",
)
async def remove_from_wishlist(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    service: WishlistService = Depends(_wishlist_service),
):
    """Remove a wishlist item. Must be the owner of the item."""
    logger.info("DELETE /wishlist/%s — user %s", item_id, current_user["_id"])
    await service.remove_item(item_id=item_id, user=current_user)


# =============================================================================
# Get Wishlist
# =============================================================================

@router.get(
    "",
    response_model=WishlistResponse,
    summary="Get my wishlist",
)
async def get_my_wishlist(
    current_user: dict = Depends(get_current_user),
    service: WishlistService = Depends(_wishlist_service),
):
    """Retrieve the authenticated user's full wishlist."""
    logger.info("GET /wishlist — user %s", current_user["_id"])
    result = await service.get_user_wishlist(current_user["_id"])
    return WishlistResponse(
        items=[WishlistItemResponse(**i) for i in result["items"]],
        total=result["total"],
    )
