"""
Product service — business logic for product management.
Enforces shop ownership, stock validation, and price history tracking.
"""

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.repositories.product_repository import ProductRepository
from app.repositories.shop_repository import ShopRepository

logger = get_logger(__name__)


class ProductService:
    """Business logic for product CRUD, pricing, and search."""

    def __init__(self, product_repo: ProductRepository, shop_repo: ShopRepository):
        self.product_repo = product_repo
        self.shop_repo = shop_repo

    # ── Create ───────────────────────────────────────────────────────────

    async def create_product(self, user: dict, data: dict) -> dict:
        """
        Create a product in a shop.
        Validates that the user owns the target shop.
        """
        shop_id = data["shop_id"]
        await self._assert_shop_ownership(shop_id, user)

        product_doc = {
            "shop_id": shop_id,
            "name": data["name"],
            "description": data.get("description", ""),
            "category": data["category"],
            "images": data.get("images", []),
            "current_price": data["current_price"],
            "stock_quantity": data.get("stock_quantity", 0),
        }

        product = await self.product_repo.create(product_doc)

        # Seed price history with initial price
        await self.product_repo.add_price_record(product["_id"], data["current_price"])
        logger.info("Product '%s' created in shop %s", data["name"], shop_id)
        return product

    # ── Update ───────────────────────────────────────────────────────────

    async def update_product(self, product_id: str, user: dict, data: dict) -> dict:
        """
        Update product fields (not price — use update_price for that).
        Only the shop owner or admin can modify.
        """
        product = await self._get_product_or_404(product_id)
        await self._assert_shop_ownership(product["shop_id"], user)

        update_fields = {k: v for k, v in data.items() if v is not None}
        if not update_fields:
            return product

        # Validate stock isn't negative
        if "stock_quantity" in update_fields and update_fields["stock_quantity"] < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock quantity cannot be negative.",
            )

        logger.info("Updating product %s — fields: %s", product_id, list(update_fields.keys()))
        await self.product_repo.update_by_id(product_id, update_fields)
        return await self.product_repo.find_by_id(product_id)

    # ── Price Update ─────────────────────────────────────────────────────

    async def update_price(self, product_id: str, user: dict, new_price: float) -> dict:
        """
        Update a product's price.
        Records the change in price_history and updates current_price.
        """
        product = await self._get_product_or_404(product_id)
        await self._assert_shop_ownership(product["shop_id"], user)

        logger.info(
            "Price update for product %s: %.2f → %.2f",
            product_id, product["current_price"], new_price,
        )
        await self.product_repo.add_price_record(product_id, new_price)
        return await self.product_repo.find_by_id(product_id)

    # ── Read ─────────────────────────────────────────────────────────────

    async def get_product(self, product_id: str) -> dict:
        """Fetch a single product by ID."""
        return await self._get_product_or_404(product_id)

    async def get_products_by_shop(self, shop_id: str, skip: int = 0, limit: int = 50) -> dict:
        """List products for a shop with total count."""
        products = await self.product_repo.find_by_shop(shop_id, skip=skip, limit=limit)
        total = await self.product_repo.count_by_shop(shop_id)
        return {"products": products, "total": total}

    async def get_price_history(self, product_id: str) -> dict:
        """Get the price history for a product."""
        await self._get_product_or_404(product_id)
        history = await self.product_repo.get_price_history(product_id)
        return {"product_id": product_id, "history": history}

    # ── Internal helpers ─────────────────────────────────────────────────

    async def _get_product_or_404(self, product_id: str) -> dict:
        """Fetch product or raise 404."""
        product = await self.product_repo.find_by_id(product_id)
        if not product:
            logger.warning("Product not found: %s", product_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )
        return product

    async def _assert_shop_ownership(self, shop_id: str, user: dict) -> None:
        """Verify the user owns the shop (admins bypass)."""
        if user.get("role") == "admin":
            return

        shop = await self.shop_repo.find_by_id(shop_id)
        if not shop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found.",
            )
        if shop["owner_id"] != user["_id"]:
            logger.warning(
                "Ownership denied: user %s tried to manage product in shop %s (owner: %s)",
                user["_id"], shop_id, shop["owner_id"],
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this shop.",
            )
