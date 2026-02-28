"""
Shared test fixtures — provides an async httpx test client
backed by the FastAPI app with a test MongoDB database.
"""

import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for all tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    """
    Async HTTP test client using httpx + ASGI transport.
    Sends requests directly to the FastAPI app (no real server needed).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    """
    Register a test user and return auth headers.
    Uses a unique email per test to avoid conflicts.
    """
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"

    response = await client.post("/api/v1/auth/signup", json={
        "first_name": "Test",
        "last_name": "User",
        "email": email,
        "password": "TestPass123!",
    })

    if response.status_code == 201:
        tokens = response.json()["tokens"]
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    # If signup fails (e.g. user exists), try login
    response = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "TestPass123!",
    })
    tokens = response.json()["tokens"]
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest_asyncio.fixture
async def shop_owner_headers(client: AsyncClient):
    """
    Register a shop_owner user and return auth headers.
    Directly sets the role in DB after signup.
    """
    import uuid
    from app.core.database import get_database

    email = f"owner_{uuid.uuid4().hex[:8]}@test.com"

    response = await client.post("/api/v1/auth/signup", json={
        "first_name": "Shop",
        "last_name": "Owner",
        "email": email,
        "password": "OwnerPass123!",
    })

    user_data = response.json()["user"]
    user_id = user_data["id"]

    # Update role to shop_owner directly in DB
    db = get_database()
    from bson import ObjectId
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": "shop_owner"}},
    )

    tokens = response.json()["tokens"]
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "user_id": user_id,
    }
