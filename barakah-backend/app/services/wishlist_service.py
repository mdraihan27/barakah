"""
Wishlist service — business logic for user wishlists.
Prevents duplicates by product name (case-insensitive).
"""

from app.core.logging import get_logger
from app.repositories.wishlist_repository import WishlistRepository

logger = get_logger(__name__)


class WishlistService:
    """Business logic for user wishlists."""

    def __init__(self, wishlist_repo: WishlistRepository):
        self.wishlist_repo = wishlist_repo

    async def add_item(self, user: dict, data: dict) -> dict:
        """Add or update a product in the user's wishlist (upsert by product name)."""
        user_id = user["_id"]
        product_name = data["product_name"]

        # Check for existing item — if found, update its target price and re-use it
        existing = await self.wishlist_repo.find_by_user_and_product(user_id, product_name)
        if existing:
            update_fields = {}
            if data.get("target_price") is not None:
                update_fields["target_price"] = data["target_price"]
            if data.get("baseline_price") is not None:
                update_fields["baseline_price"] = data["baseline_price"]
            if data.get("source_product_id"):
                update_fields["source_product_id"] = data["source_product_id"]
            if data.get("source_shop_id"):
                update_fields["source_shop_id"] = data["source_shop_id"]
            if data.get("user_lat") is not None:
                update_fields["user_lat"] = data["user_lat"]
            if data.get("user_lng") is not None:
                update_fields["user_lng"] = data["user_lng"]

            if update_fields:
                await self.wishlist_repo.update_by_id(existing["_id"], update_fields)
                existing.update(update_fields)
            logger.info("Wishlist item updated: user %s, product '%s'", user_id, product_name)
            return existing

        item_doc = {
            "user_id": user_id,
            "product_name": product_name,
            "target_price": data.get("target_price"),
            "baseline_price": data.get("baseline_price"),
            "source_product_id": data.get("source_product_id"),
            "source_shop_id": data.get("source_shop_id"),
            "user_lat": data.get("user_lat"),
            "user_lng": data.get("user_lng"),
            "radius_km": data.get("radius_km", 10.0),
            "last_alerted_price": None,
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
