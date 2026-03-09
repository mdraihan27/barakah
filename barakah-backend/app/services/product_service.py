"""
Product service — business logic for product management.
Enforces shop ownership, stock validation, and price history tracking.
"""

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.services.notification_service import NotificationService
from app.repositories.product_repository import ProductRepository
from app.repositories.shop_repository import ShopRepository

logger = get_logger(__name__)


class ProductService:
    """Business logic for product CRUD, pricing, and search."""

    def __init__(
        self,
        product_repo: ProductRepository,
        shop_repo: ShopRepository,
        notification_service: NotificationService,
    ):
        self.product_repo = product_repo
        self.shop_repo = shop_repo
        self.notification_service = notification_service
        self._nearby_alert_radius_km = 10.0

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

        # Immediately alert nearby competing shop owners if this new listing is cheaper.
        await self._notify_nearby_shops_for_lower_price(product)

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
        updated = await self.product_repo.find_by_id(product_id)
        await self._notify_nearby_shops_for_lower_price(updated)
        return updated

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

    async def _notify_nearby_shops_for_lower_price(self, source_product: dict) -> None:
        """
        Notify nearby shop owners (10km) when their matching product is priced higher
        than the newly listed/updated product.
        """
        source_shop = await self.shop_repo.find_by_id(source_product["shop_id"])
        if not source_shop or not source_shop.get("location"):
            return

        try:
            source_lng, source_lat = source_shop["location"]["coordinates"]
        except Exception:
            return

        nearby_shops = await self.shop_repo.find_nearby(
            lng=source_lng,
            lat=source_lat,
            radius_km=self._nearby_alert_radius_km,
        )

        source_name = (source_product.get("name") or "").strip().lower()
        if not source_name:
            return

        for nearby_shop in nearby_shops:
            if nearby_shop["_id"] == source_shop["_id"]:
                continue

            nearby_products = await self.product_repo.find_by_shop(nearby_shop["_id"])
            matching_products = []
            for nearby_product in nearby_products:
                candidate_name = (nearby_product.get("name") or "").strip().lower()
                if candidate_name == source_name:
                    matching_products.append(nearby_product)

            if not matching_products:
                continue

            source_price = float(source_product.get("current_price") or 0)
            if source_price <= 0:
                continue

            # Alert once per nearby shop using that shop's lowest matching price.
            cheapest_match = min(
                matching_products,
                key=lambda p: float(p.get("current_price") or 0),
            )
            nearby_price = float(cheapest_match.get("current_price") or 0)
            if nearby_price <= 0:
                continue

            if source_price < nearby_price:
                await self.notification_service.create_notification(
                    user_id=nearby_shop["owner_id"],
                    notification_type="competitive_price",
                    title="Lower price nearby",
                    message=(
                        f"A nearby shop ({source_shop.get('name', 'Unknown')}) is selling "
                        f"'{source_product.get('name')}' for ৳{source_price:.2f}, "
                        f"which is lower than your ৳{nearby_price:.2f}."
                    ),
                    payload={
                        "product_name": source_product.get("name"),
                        "your_shop_id": nearby_shop["_id"],
                        "your_product_id": cheapest_match.get("_id"),
                        "your_price": nearby_price,
                        "competitor_shop_id": source_shop["_id"],
                        "competitor_shop_name": source_shop.get("name"),
                        "competitor_product_id": source_product.get("_id"),
                        "competitor_price": source_price,
                        "radius_km": self._nearby_alert_radius_km,
                    },
                )
