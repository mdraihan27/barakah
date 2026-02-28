"""
Review routes — /api/v1/reviews/* and /api/v1/shops/{id}/reviews endpoints.
"""

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.review_repository import ReviewRepository
from app.repositories.shop_repository import ShopRepository
from app.schemas.review import (
    ReviewCreateRequest,
    ReviewListResponse,
    ReviewResponse,
)
from app.services.review_service import ReviewService

logger = get_logger(__name__)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _review_service(db=Depends(get_db)) -> ReviewService:
    return ReviewService(ReviewRepository(db), ShopRepository(db))


# =============================================================================
# Create Review (authenticated)
# =============================================================================

@router.post(
    "/shops/{shop_id}",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Review a shop",
)
async def create_review(
    shop_id: str,
    body: ReviewCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: ReviewService = Depends(_review_service),
):
    """
    Submit a review for a shop. One review per user per shop.
    Automatically recalculates the shop's average rating.
    """
    logger.info("POST /reviews/shops/%s — user %s", shop_id, current_user["_id"])
    review = await service.create_review(
        user=current_user,
        shop_id=shop_id,
        data=body.model_dump(),
    )
    return ReviewResponse(**review)


# =============================================================================
# Get Shop Reviews (public)
# =============================================================================

@router.get(
    "/shops/{shop_id}",
    response_model=ReviewListResponse,
    summary="List reviews for a shop",
)
async def get_shop_reviews(
    shop_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: ReviewService = Depends(_review_service),
):
    """Get all reviews for a specific shop with average rating. Public endpoint."""
    logger.info("GET /reviews/shops/%s", shop_id)
    result = await service.get_shop_reviews(shop_id, skip=skip, limit=limit)
    return ReviewListResponse(
        reviews=[ReviewResponse(**r) for r in result["reviews"]],
        total=result["total"],
        average_rating=result["average_rating"],
    )
