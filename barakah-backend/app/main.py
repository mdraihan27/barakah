"""
Barakah Backend — FastAPI application entry point.
Sets up middleware, lifespan events, and route registration.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.core.logging import get_logger, setup_logging
from app.repositories.user_repository import UserRepository
from app.routes import auth

# ── Bootstrap logging before anything else ──────────────────────────────────
settings = get_settings()
setup_logging("DEBUG" if settings.DEBUG else "INFO")
logger = get_logger(__name__)


# ── Lifespan: startup & shutdown hooks ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run setup on startup, teardown on shutdown."""
    logger.info("Starting %s v%s (%s)", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)

    # Startup
    await connect_to_mongo()

    # Ensure DB indexes
    db = get_database()
    user_repo = UserRepository(db)
    await user_repo.ensure_indexes()

    yield  # ← application is running

    # Shutdown
    await close_mongo_connection()
    logger.info("Application shutdown complete.")


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

app.include_router(auth.router, prefix="/api/v1")


# ── Health check ────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Quick liveness probe."""
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
