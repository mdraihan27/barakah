"""
Shop service — orchestrates business logic for shop management.
Enforces role-based access, ownership validation, and data integrity.
"""

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.repositories.shop_repository import ShopRepository

logger = get_logger(__name__)


class ShopService:
    """Business logic for shop CRUD and geospatial queries."""

    def __init__(self, shop_repo: ShopRepository):
        self.shop_repo = shop_repo

    # ── Create ───────────────────────────────────────────────────────────

    async def create_shop(self, owner: dict, data: dict) -> dict:
        """
        Create a new shop for the authenticated shop_owner.
        The owner document is already role-validated by the route dependency.
        """
        owner_id = owner["_id"]
        logger.info("Creating shop '%s' for owner %s", data.get("name"), owner_id)

        # Ensure nested schemas are plain dicts for MongoDB
        location = data["location"]
        if hasattr(location, "model_dump"):
            location = location.model_dump()

        address = data.get("address", {})
        if hasattr(address, "model_dump"):
            address = address.model_dump()

        shop_doc = {
            "owner_id": owner_id,
            "name": data["name"],
            "description": data.get("description", ""),
            "category": data["category"],
            "image_url": data.get("image_url", ""),
            "location": location,
            "address": address,
        }

        shop = await self.shop_repo.create(shop_doc)
        logger.info("Shop created successfully: %s", shop["_id"])
        return shop

    # ── Update ───────────────────────────────────────────────────────────

    async def update_shop(self, shop_id: str, owner: dict, data: dict) -> dict:
        """
        Update an existing shop. Only the owner (or admin) can modify it.
        Returns the updated shop document.
        """
        shop = await self._get_shop_or_404(shop_id)
        self._assert_ownership(shop, owner)

        # Build update payload — only include provided (non-None) fields
        update_fields = {k: v for k, v in data.items() if v is not None}
        if not update_fields:
            logger.info("No fields to update for shop %s", shop_id)
            return shop

        logger.info("Updating shop %s — fields: %s", shop_id, list(update_fields.keys()))
        await self.shop_repo.update_by_id(shop_id, update_fields)

        # Return fresh document
        updated = await self.shop_repo.find_by_id(shop_id)
        logger.info("Shop %s updated successfully", shop_id)
        return updated

    # ── Read ─────────────────────────────────────────────────────────────

    async def get_shop(self, shop_id: str) -> dict:
        """Fetch a single shop by ID (public)."""
        logger.info("Fetching shop %s", shop_id)
        return await self._get_shop_or_404(shop_id)

    async def get_nearby_shops(
        self,
        lat: float,
        lng: float,
        radius_km: float = 10.0,
        limit: int = 50,
    ) -> list:
        """Find shops near a geographic point (public)."""
        logger.info("Nearby shop search: lat=%.4f lng=%.4f radius=%.1fkm", lat, lng, radius_km)
        shops = await self.shop_repo.find_nearby(lng=lng, lat=lat, radius_km=radius_km, limit=limit)
        return shops

    async def get_owner_shops(self, owner_id: str) -> list:
        """Get all shops belonging to a specific owner."""
        logger.info("Fetching shops for owner %s", owner_id)
        return await self.shop_repo.find_by_owner(owner_id)

    # ── Internal helpers ─────────────────────────────────────────────────

    async def _get_shop_or_404(self, shop_id: str) -> dict:
        """Fetch shop or raise 404."""
        shop = await self.shop_repo.find_by_id(shop_id)
        if not shop:
            logger.warning("Shop not found: %s", shop_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found.",
            )
        return shop

    @staticmethod
    def _assert_ownership(shop: dict, user: dict) -> None:
        """Raise 403 if the user doesn't own the shop (admins are exempt)."""
        if user.get("role") == "admin":
            return
        if shop["owner_id"] != user["_id"]:
            logger.warning(
                "Ownership denied: user %s tried to modify shop %s (owner: %s)",
                user["_id"], shop["_id"], shop["owner_id"],
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this shop.",
            )
