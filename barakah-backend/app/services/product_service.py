"""
Product service — business logic for product management.
Enforces shop ownership, stock validation, and price history tracking.
"""

import re

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.services.notification_service import NotificationService
from app.repositories.product_repository import ProductRepository
from app.repositories.product_catalog_repository import ProductCatalogRepository
from app.repositories.shop_repository import ShopRepository
from app.repositories.wishlist_repository import WishlistRepository

logger = get_logger(__name__)


class ProductService:
    """Business logic for product CRUD, pricing, and search."""

    def __init__(
        self,
        product_repo: ProductRepository,
        product_catalog_repo: ProductCatalogRepository,
        shop_repo: ShopRepository,
        notification_service: NotificationService,
        wishlist_repo: WishlistRepository,
    ):
        self.product_repo = product_repo
        self.product_catalog_repo = product_catalog_repo
        self.shop_repo = shop_repo
        self.notification_service = notification_service
        self.wishlist_repo = wishlist_repo
        self._nearby_alert_radius_km = 10.0
        self._default_categories = [
            "Rice", "Lentils", "Oil", "Spices", "Flour", "Sugar", "Salt", "Tea",
            "Milk", "Eggs", "Vegetables", "Fruits", "Fish", "Meat", "Snacks",
            "Beverages", "Cleaning", "Personal Care", "Baby Products", "Other",
        ]

    # ── Create ───────────────────────────────────────────────────────────

    async def create_product(self, user: dict, data: dict) -> dict:
        """
        Create a product in a shop.
        Validates that the user owns the target shop.
        """
        shop_id = data["shop_id"]
        await self._assert_shop_ownership(shop_id, user)
        await self._assert_catalog_name_allowed(category=data["category"], name=data["name"])

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
        await self._notify_wishlist_users_for_price_drop(product)

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

        if "name" in update_fields or "category" in update_fields:
            next_name = (update_fields.get("name") if "name" in update_fields else product.get("name"))
            next_category = (
                update_fields.get("category")
                if "category" in update_fields
                else product.get("category")
            )
            await self._assert_catalog_name_allowed(category=next_category, name=next_name)

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
        await self._notify_wishlist_users_for_price_drop(updated)
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

    async def list_catalog_categories(self) -> list[str]:
        """Return category options for product creation/editing."""
        categories = set(self._default_categories)

        db_categories = await self.product_catalog_repo.list_categories()
        categories.update([c.strip() for c in db_categories if isinstance(c, str) and c.strip()])

        product_categories = await self.product_repo.collection.distinct("category")
        categories.update([c.strip() for c in product_categories if isinstance(c, str) and c.strip()])

        return sorted(categories, key=str.lower)

    async def list_catalog_names(self, category: str) -> list[str]:
        """Return all known product names for one category."""
        category_clean = (category or "").strip()
        if not category_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is required.",
            )

        names: dict[str, str] = {}

        # Global catalog names.
        for name in await self.product_catalog_repo.list_names_by_category(category_clean):
            key = name.strip().lower()
            if key:
                names[key] = name.strip()

        # Existing product names across all shops.
        existing = await self.product_repo.collection.distinct(
            "name",
            {"category": {"$regex": f"^{re.escape(category_clean)}$", "$options": "i"}},
        )
        for name in existing:
            if isinstance(name, str) and name.strip():
                key = name.strip().lower()
                names.setdefault(key, name.strip())

        return sorted(names.values(), key=str.lower)

    async def add_catalog_name(self, category: str, name: str) -> dict:
        """Add one new product name to the global catalog."""
        category_clean = (category or "").strip()
        name_clean = (name or "").strip()

        if len(category_clean) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category must be at least 2 characters.",
            )
        if len(name_clean) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product name must be at least 2 characters.",
            )

        if await self._is_name_allowed(category_clean, name_clean):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product name already exists in this category.",
            )

        await self.product_catalog_repo.add_name(category_clean, name_clean)
        names = await self.list_catalog_names(category_clean)
        return {"category": category_clean, "names": names}

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

    async def _assert_catalog_name_allowed(self, category: str, name: str) -> None:
        """Enforce that product name is selected from category-based catalog."""
        category_clean = (category or "").strip()
        name_clean = (name or "").strip()

        if not category_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is required.",
            )
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product name is required.",
            )

        if not await self._is_name_allowed(category_clean, name_clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Product name is not in the selected category list. "
                    "Add it to the global list first."
                ),
            )

    async def _is_name_allowed(self, category: str, name: str) -> bool:
        category_clean = category.strip()
        name_clean = name.strip()

        if await self.product_catalog_repo.exists_name(category_clean, name_clean):
            return True

        existing = await self.product_repo.collection.find_one(
            {
                "category": {"$regex": f"^{re.escape(category_clean)}$", "$options": "i"},
                "name": {"$regex": f"^{re.escape(name_clean)}$", "$options": "i"},
            },
            {"_id": 1},
        )
        return existing is not None

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

    async def process_wishlist_alerts_for_all_products(self) -> None:
        """Periodic fallback: evaluate wishlist drop alerts against all products."""
        cursor = self.product_repo.collection.find({}, {"_id": 1, "name": 1, "shop_id": 1, "current_price": 1})
        async for product in cursor:
            product["_id"] = str(product["_id"])
            await self._notify_wishlist_users_for_price_drop(product)

    async def _notify_wishlist_users_for_price_drop(self, source_product: dict) -> None:
        """
        Notify users in real time when a wishlisted item gets a new lower price
        within the user's configured nearby radius (default 10km).
        """
        source_name = (source_product.get("name") or "").strip()
        source_price = float(source_product.get("current_price") or 0)
        source_shop_id = source_product.get("shop_id")
        source_product_id = source_product.get("_id")
        if not source_name or not source_shop_id or source_price <= 0:
            return

        source_shop = await self.shop_repo.find_by_id(source_shop_id)
        if not source_shop:
            return

        wishlist_items = await self.wishlist_repo.find_by_product_name(source_name)
        if not wishlist_items:
            return

        for item in wishlist_items:
            if not self._matches_wishlist_item(source_product, item):
                continue

            radius_km = float(item.get("radius_km") or self._nearby_alert_radius_km)
            exact_source_match = self._is_exact_source_match(source_product, item)

            # Exact product updates should always notify regardless of distance.
            if not exact_source_match:
                user_lat = item.get("user_lat")
                user_lng = item.get("user_lng")
                if user_lat is None or user_lng is None:
                    continue

                nearby_shops = await self.shop_repo.find_nearby(
                    lng=float(user_lng),
                    lat=float(user_lat),
                    radius_km=radius_km,
                    limit=100,
                )
                nearby_shop_ids = {shop["_id"] for shop in nearby_shops}
                if source_shop_id not in nearby_shop_ids:
                    continue

            reference_price = self._get_reference_price(item)
            if reference_price is None:
                continue

            # Alert only for newly lower prices to avoid repeated notifications.
            if source_price >= reference_price:
                continue

            await self.notification_service.create_notification(
                user_id=item["user_id"],
                notification_type="wishlist_price_drop",
                title="Wishlist price dropped",
                message=(
                    f"'{item['product_name']}' is now ৳{source_price:.2f} at "
                    f"{source_shop.get('name', 'a nearby shop')} "
                    f"within {radius_km:.0f}km of your location."
                ),
                payload={
                    "wishlist_item_id": item["_id"],
                    "product_name": item["product_name"],
                    "match_scope": "exact_product" if exact_source_match else "nearby_same_name",
                    "matched_product_id": source_product_id,
                    "matched_shop_id": source_shop_id,
                    "matched_shop_name": source_shop.get("name"),
                    "current_price": source_price,
                    "previous_reference_price": reference_price,
                    "target_price": item.get("target_price"),
                    "baseline_price": item.get("baseline_price"),
                    "radius_km": radius_km,
                },
            )

            await self.wishlist_repo.update_by_id(
                item["_id"],
                {
                    "last_alerted_price": source_price,
                    "last_alerted_product_id": source_product_id,
                },
            )

    @staticmethod
    def _get_reference_price(item: dict) -> float | None:
        """
        Determine comparison baseline for the next alert:
        1) last alerted price
        2) baseline wishlist price
        3) user target price
        """
        for key in ("last_alerted_price", "baseline_price", "target_price"):
            value = item.get(key)
            if value is not None:
                try:
                    parsed = float(value)
                except (TypeError, ValueError):
                    continue
                if parsed > 0:
                    return parsed
        return None

    @staticmethod
    def _matches_wishlist_item(source_product: dict, item: dict) -> bool:
        source_name = (source_product.get("name") or "").strip()
        wishlist_name = (item.get("product_name") or "").strip()
        if not source_name or not wishlist_name:
            return False

        source_product_id = source_product.get("_id")
        item_source_product_id = item.get("source_product_id")
        if item_source_product_id and source_product_id == item_source_product_id:
            return True

        return re.fullmatch(re.escape(wishlist_name), source_name, re.IGNORECASE) is not None

    @staticmethod
    def _is_exact_source_match(source_product: dict, item: dict) -> bool:
        source_product_id = source_product.get("_id")
        source_shop_id = source_product.get("shop_id")
        item_source_product_id = item.get("source_product_id")
        item_source_shop_id = item.get("source_shop_id")

        if item_source_product_id and source_product_id == item_source_product_id:
            return True

        return bool(item_source_shop_id and source_shop_id == item_source_shop_id)
