"""
Review service — business logic for reviews and shop rating recalculation.
Enforces one-review-per-user-per-shop and keeps shop.rating_average in sync.
"""

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.repositories.review_repository import ReviewRepository
from app.repositories.shop_repository import ShopRepository

logger = get_logger(__name__)


class ReviewService:
    """Business logic for reviews and rating calculations."""

    def __init__(self, review_repo: ReviewRepository, shop_repo: ShopRepository):
        self.review_repo = review_repo
        self.shop_repo = shop_repo

    # ── Create ───────────────────────────────────────────────────────────

    async def create_review(self, user: dict, shop_id: str, data: dict) -> dict:
        """
        Create a review for a shop.
        Enforces one review per user per shop, then recalculates shop rating.
        """
        # Verify shop exists
        shop = await self.shop_repo.find_by_id(shop_id)
        if not shop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found.",
            )

        # Check for duplicate review
        existing = await self.review_repo.find_by_user_and_shop(user["_id"], shop_id)
        if existing:
            logger.warning("Duplicate review attempt: user %s → shop %s", user["_id"], shop_id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already reviewed this shop.",
            )

        # Build review document
        review_doc = {
            "user_id": user["_id"],
            "shop_id": shop_id,
            "rating": data["rating"],
            "text": data.get("text", ""),
            "reviewer_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        }

        review = await self.review_repo.create(review_doc)

        # Recalculate shop rating and update the shop document
        await self._recalculate_shop_rating(shop_id)

        logger.info("Review created by user %s for shop %s (rating: %d)", user["_id"], shop_id, data["rating"])
        return review

    # ── Read ─────────────────────────────────────────────────────────────

    async def get_shop_reviews(self, shop_id: str, skip: int = 0, limit: int = 50) -> dict:
        """Get all reviews for a shop with aggregate info."""
        # Verify shop exists
        shop = await self.shop_repo.find_by_id(shop_id)
        if not shop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found.",
            )

        reviews = await self.review_repo.find_by_shop(shop_id, skip=skip, limit=limit)
        rating_info = await self.review_repo.calculate_shop_rating(shop_id)

        return {
            "reviews": reviews,
            "total": rating_info["count"],
            "average_rating": rating_info["average"],
        }

    # ── Internal helpers ─────────────────────────────────────────────────

    async def _recalculate_shop_rating(self, shop_id: str) -> None:
        """Recalculate and persist the shop's average rating."""
        rating_info = await self.review_repo.calculate_shop_rating(shop_id)
        await self.shop_repo.update_by_id(
            shop_id,
            {
                "rating_average": rating_info["average"],
                "total_reviews": rating_info["count"],
            },
        )
        logger.info(
            "Shop %s rating recalculated: %.2f (%d reviews)",
            shop_id, rating_info["average"], rating_info["count"],
        )
