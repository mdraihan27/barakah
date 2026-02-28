"""
Price monitoring background tasks.
Runs periodic checks for competitive pricing and wishlist price alerts.
Uses asyncio tasks launched from FastAPI's lifespan.
"""

import asyncio
import re

from bson import ObjectId

from app.core.database import get_database
from app.core.logging import get_logger
from app.repositories.notification_repository import NotificationRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.shop_repository import ShopRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.notification_service import NotificationService

logger = get_logger(__name__)

# ── Configuration ───────────────────────────────────────────────────────────

MONITOR_INTERVAL_SECONDS = 3600  # Run every hour
NEARBY_RADIUS_KM = 10.0         # Search radius for competitive pricing


# =============================================================================
# Job 1 — Competitive Pricing Monitor
# =============================================================================

async def _check_competitive_pricing() -> None:
    """
    For each product, find nearby shops selling the same product name.
    If a competitor has a cheaper price, notify the shop owner.
    """
    db = get_database()
    product_repo = ProductRepository(db)
    shop_repo = ShopRepository(db)
    notification_svc = NotificationService(NotificationRepository(db))

    # Get all shops
    shops_cursor = db["shops"].find({"is_active": True})
    shops_by_id = {}
    async for shop in shops_cursor:
        shop["_id"] = str(shop["_id"])
        shops_by_id[shop["_id"]] = shop

    if not shops_by_id:
        logger.debug("No active shops — skipping competitive pricing check")
        return

    # Get all products
    products_cursor = db["products"].find()
    products = []
    async for product in products_cursor:
        product["_id"] = str(product["_id"])
        products.append(product)

    logger.info(
        "Competitive pricing check: %d products across %d shops",
        len(products), len(shops_by_id),
    )

    alerts_sent = 0

    for product in products:
        shop = shops_by_id.get(product["shop_id"])
        if not shop or not shop.get("location"):
            continue

        # Find nearby shops
        lng, lat = shop["location"]["coordinates"]
        nearby_shops = await shop_repo.find_nearby(
            lng=lng, lat=lat, radius_km=NEARBY_RADIUS_KM
        )

        for nearby_shop in nearby_shops:
            if nearby_shop["_id"] == shop["_id"]:
                continue  # skip own shop

            # Find matching products by name in the nearby shop
            nearby_products = await product_repo.find_by_shop(nearby_shop["_id"])
            for np in nearby_products:
                if (
                    np["name"].lower() == product["name"].lower()
                    and np["current_price"] < product["current_price"]
                ):
                    # Notify the owner
                    await notification_svc.create_notification(
                        user_id=shop["owner_id"],
                        notification_type="competitive_price",
                        title="Competitive Price Alert",
                        message=(
                            f"'{product['name']}' is priced at "
                            f"${np['current_price']:.2f} at {nearby_shop['name']} "
                            f"(yours: ${product['current_price']:.2f})."
                        ),
                        payload={
                            "product_id": product["_id"],
                            "competitor_shop_id": nearby_shop["_id"],
                            "competitor_price": np["current_price"],
                            "your_price": product["current_price"],
                        },
                    )
                    alerts_sent += 1

    logger.info("Competitive pricing check complete: %d alerts sent", alerts_sent)


# =============================================================================
# Job 2 — Wishlist Price Monitoring
# =============================================================================

async def _check_wishlist_prices() -> None:
    """
    For each wishlist item with a target_price:
    - Find products matching the name
    - If price ≤ target_price, notify the user
    """
    db = get_database()
    wishlist_repo = WishlistRepository(db)
    notification_svc = NotificationService(NotificationRepository(db))

    items = await wishlist_repo.find_all_with_target_price()
    if not items:
        logger.debug("No wishlist items with target prices — skipping")
        return

    logger.info("Wishlist price check: %d items to monitor", len(items))
    alerts_sent = 0

    for item in items:
        # Find products matching the wishlist product name (case-insensitive)
        escaped_name = re.escape(item["product_name"])
        products_cursor = db["products"].find({
            "name": {"$regex": f"^{escaped_name}$", "$options": "i"}
        })

        async for product in products_cursor:
            product["_id"] = str(product["_id"])

            if product["current_price"] <= item["target_price"]:
                # Fetch shop name for the notification
                shop = await db["shops"].find_one(
                    {"_id": ObjectId(product["shop_id"])}
                )
                shop_name = shop["name"] if shop else "Unknown Shop"

                await notification_svc.create_notification(
                    user_id=item["user_id"],
                    notification_type="wishlist_price_drop",
                    title="Wishlist Price Alert!",
                    message=(
                        f"'{item['product_name']}' is now "
                        f"${product['current_price']:.2f} at {shop_name} "
                        f"(your target: ${item['target_price']:.2f})."
                    ),
                    payload={
                        "wishlist_item_id": item["_id"],
                        "product_id": product["_id"],
                        "shop_id": product["shop_id"],
                        "current_price": product["current_price"],
                        "target_price": item["target_price"],
                    },
                )
                alerts_sent += 1

    logger.info("Wishlist price check complete: %d alerts sent", alerts_sent)


# =============================================================================
# Main Monitor Loop
# =============================================================================

async def run_price_monitor() -> None:
    """
    Periodically run both pricing jobs.
    Designed to be launched as an asyncio background task from FastAPI lifespan.
    """
    logger.info(
        "Price monitor started — interval: %ds, radius: %.1fkm",
        MONITOR_INTERVAL_SECONDS, NEARBY_RADIUS_KM,
    )

    while True:
        try:
            # Wait before the first run to let the app fully start
            await asyncio.sleep(MONITOR_INTERVAL_SECONDS)

            logger.info("Price monitor — running cycle")
            await _check_competitive_pricing()
            await _check_wishlist_prices()
            logger.info("Price monitor — cycle complete")

        except asyncio.CancelledError:
            logger.info("Price monitor shutting down")
            break
        except Exception as exc:
            logger.error("Price monitor error: %s", exc, exc_info=True)
            # Don't crash the loop — wait and retry
            await asyncio.sleep(60)
