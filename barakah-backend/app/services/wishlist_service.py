"""
Wishlist service — business logic for user wishlists.
Prevents duplicates by product name (case-insensitive).
"""

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.repositories.wishlist_repository import WishlistRepository

logger = get_logger(__name__)


class WishlistService:
    """Business logic for user wishlists."""

    def __init__(self, wishlist_repo: WishlistRepository):
        self.wishlist_repo = wishlist_repo

    async def add_item(self, user: dict, data: dict) -> dict:
        """Add a product to the user's wishlist. Prevents duplicates."""
        user_id = user["_id"]
        product_name = data["product_name"]

        # Check for duplicate
        existing = await self.wishlist_repo.find_by_user_and_product(user_id, product_name)
        if existing:
            logger.info("Duplicate wishlist item: user %s, product '%s'", user_id, product_name)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This product is already in your wishlist.",
            )

        item_doc = {
            "user_id": user_id,
            "product_name": product_name,
            "target_price": data.get("target_price"),
        }

        item = await self.wishlist_repo.create(item_doc)
        logger.info("Wishlist item added: user %s — '%s'", user_id, product_name)
        return item

    async def remove_item(self, item_id: str, user: dict) -> None:
        """Remove an item from the user's wishlist. Must own the item."""
        item = await self.wishlist_repo.find_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wishlist item not found.",
            )

        if item["user_id"] != user["_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only remove your own wishlist items.",
            )

        await self.wishlist_repo.delete_by_id(item_id)
        logger.info("Wishlist item removed: %s by user %s", item_id, user["_id"])

    async def get_user_wishlist(self, user_id: str) -> dict:
        """Get all wishlist items for a user."""
        items = await self.wishlist_repo.find_by_user(user_id)
        return {"items": items, "total": len(items)}
