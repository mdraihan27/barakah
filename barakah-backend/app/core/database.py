"""
MongoDB connection management using Motor (async driver).
Provides a single reusable database instance across the app.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Module-level references (populated on startup, torn down on shutdown) ────
_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Open a MongoDB connection and store the client + db reference."""
    global _client, _database
    settings = get_settings()

    logger.info("Connecting to MongoDB at %s ...", settings.MONGODB_URL)
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _database = _client[settings.MONGODB_DB_NAME]

    # Quick connectivity check
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connection established — db: %s", settings.MONGODB_DB_NAME)
    except Exception as exc:
        logger.error("MongoDB connection failed: %s", exc)
        raise


async def close_mongo_connection() -> None:
    """Gracefully close the MongoDB connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Return the current database instance (call after startup)."""
    if _database is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _database
