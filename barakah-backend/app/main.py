"""
Barakah Backend — FastAPI application entry point.
Sets up middleware, lifespan events, background tasks, and route registration.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.core.logging import get_logger, setup_logging
from app.utils.file_upload import get_upload_storage_dir

# ── Domain repositories (for index setup) ───────────────────────────────────
from app.repositories.user_repository import UserRepository
from app.repositories.shop_repository import ShopRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.product_catalog_repository import ProductCatalogRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.chat_repository import ChatRepository

# ── Route modules ───────────────────────────────────────────────────────────
from app.api.v1 import (
    auth,
    shops,
    products,
    search,
    reviews,
    wishlist,
    notifications,
    chat,
    uploads,
)

# ── Background tasks ────────────────────────────────────────────────────────
from app.tasks.price_monitor import run_price_monitor

# ── Bootstrap logging before anything else ──────────────────────────────────
settings = get_settings()
setup_logging("DEBUG" if settings.DEBUG else "INFO")
logger = get_logger(__name__)


# ── Lifespan: startup & shutdown hooks ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run setup on startup, teardown on shutdown."""
    logger.info("Starting %s v%s (%s)", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)

    # Startup — connect to MongoDB
    await connect_to_mongo()

    # Ensure DB indexes for all collections
    db = get_database()
    await _ensure_all_indexes(db)

    # Start background tasks
    monitor_task = asyncio.create_task(run_price_monitor())
    logger.info("Background price monitor task started.")

    yield  # ← application is running

    # Shutdown — cancel background tasks
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass

    await close_mongo_connection()
    logger.info("Application shutdown complete.")


async def _ensure_all_indexes(db) -> None:
    """Create indexes for every collection at startup."""
    product_catalog_repo = ProductCatalogRepository(db)
    repos = [
        UserRepository(db),
        ShopRepository(db),
        ProductRepository(db),
        product_catalog_repo,
        ReviewRepository(db),
        WishlistRepository(db),
        NotificationRepository(db),
        ChatRepository(db),
    ]
    for repo in repos:
        await repo.ensure_indexes()

    # Ensure category dropdown has initial global product names for new installs.
    await product_catalog_repo.seed_default_catalog()

    logger.info("All collection indexes ensured.")


# ── Application factory ────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Barakah platform backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────────────────

_API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=_API_PREFIX)
app.include_router(shops.router, prefix=_API_PREFIX)
app.include_router(products.router, prefix=_API_PREFIX)
app.include_router(search.router, prefix=_API_PREFIX)
app.include_router(reviews.router, prefix=_API_PREFIX)
app.include_router(wishlist.router, prefix=_API_PREFIX)
app.include_router(notifications.router, prefix=_API_PREFIX)
app.include_router(chat.router, prefix=_API_PREFIX)
app.include_router(uploads.router, prefix=_API_PREFIX)

upload_dir = get_upload_storage_dir()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=str(upload_dir)), name="uploads")


# ── Health check ────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Quick liveness probe."""
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
