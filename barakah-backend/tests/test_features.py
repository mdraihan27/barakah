"""
Test suite for Phase 3-9 features.
Covers shop creation, product search, reviews, wishlist, chat, and notifications.
"""

import pytest
from httpx import AsyncClient


# =============================================================================
# Test: Shop Creation
# =============================================================================

@pytest.mark.asyncio
async def test_shop_creation(client: AsyncClient, shop_owner_headers: dict):
    """Shop owners should be able to create a shop with valid GeoJSON location."""
    headers = {k: v for k, v in shop_owner_headers.items() if k == "Authorization"}

    response = await client.post(
        "/api/v1/shops",
        headers=headers,
        json={
            "name": "Test Grocery",
            "description": "A test grocery shop",
            "category": "grocery",
            "location": {
                "type": "Point",
                "coordinates": [90.4125, 23.8103],
            },
            "address": {
                "street": "123 Test St",
                "city": "Dhaka",
                "country": "Bangladesh",
            },
        },
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["name"] == "Test Grocery"
    assert data["category"] == "grocery"
    assert data["rating_average"] == 0.0
    assert data["is_active"] is True


# =============================================================================
# Test: Regular user cannot create shop
# =============================================================================

@pytest.mark.asyncio
async def test_regular_user_cannot_create_shop(client: AsyncClient, auth_headers: dict):
    """Regular users (role='user') should be denied shop creation."""
    response = await client.post(
        "/api/v1/shops",
        headers=auth_headers,
        json={
            "name": "Unauthorized Shop",
            "description": "Should fail",
            "category": "grocery",
            "location": {
                "type": "Point",
                "coordinates": [90.4125, 23.8103],
            },
        },
    )

    assert response.status_code == 403


# =============================================================================
# Test: Product creation in own shop
# =============================================================================

@pytest.mark.asyncio
async def test_product_creation(client: AsyncClient, shop_owner_headers: dict):
    """Shop owners should be able to add products to their own shops."""
    headers = {k: v for k, v in shop_owner_headers.items() if k == "Authorization"}

    # Create shop first
    shop_resp = await client.post(
        "/api/v1/shops",
        headers=headers,
        json={
            "name": "Product Test Shop",
            "category": "food",
            "location": {"type": "Point", "coordinates": [90.4, 23.8]},
        },
    )
    shop_id = shop_resp.json()["id"]

    # Create product
    response = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "shop_id": shop_id,
            "name": "Organic Honey",
            "description": "Pure wildflower honey",
            "category": "food",
            "current_price": 29.99,
            "stock_quantity": 50,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Organic Honey"
    assert data["current_price"] == 29.99
    assert data["stock_quantity"] == 50


# =============================================================================
# Test: Review with rating recalculation
# =============================================================================

@pytest.mark.asyncio
async def test_review_rating_recalculation(client: AsyncClient, shop_owner_headers: dict, auth_headers: dict):
    """After a review, the shop's average rating should be recalculated."""
    owner_headers = {k: v for k, v in shop_owner_headers.items() if k == "Authorization"}

    # Create shop
    shop_resp = await client.post(
        "/api/v1/shops",
        headers=owner_headers,
        json={
            "name": "Review Test Shop",
            "category": "food",
            "location": {"type": "Point", "coordinates": [90.4, 23.8]},
        },
    )
    shop_id = shop_resp.json()["id"]

    # Submit review as regular user
    review_resp = await client.post(
        f"/api/v1/reviews/shops/{shop_id}",
        headers=auth_headers,
        json={"rating": 4, "text": "Great shop!"},
    )

    assert review_resp.status_code == 201
    assert review_resp.json()["rating"] == 4

    # Check shop rating was updated
    shop_resp = await client.get(f"/api/v1/shops/{shop_id}")
    assert shop_resp.status_code == 200
    assert shop_resp.json()["rating_average"] == 4.0


# =============================================================================
# Test: Duplicate review prevented
# =============================================================================

@pytest.mark.asyncio
async def test_duplicate_review_prevented(client: AsyncClient, shop_owner_headers: dict, auth_headers: dict):
    """A user should not be able to review the same shop twice."""
    owner_headers = {k: v for k, v in shop_owner_headers.items() if k == "Authorization"}

    # Create shop
    shop_resp = await client.post(
        "/api/v1/shops",
        headers=owner_headers,
        json={
            "name": "Dup Review Shop",
            "category": "food",
            "location": {"type": "Point", "coordinates": [90.4, 23.8]},
        },
    )
    shop_id = shop_resp.json()["id"]

    # First review — should succeed
    resp1 = await client.post(
        f"/api/v1/reviews/shops/{shop_id}",
        headers=auth_headers,
        json={"rating": 5, "text": "Excellent!"},
    )
    assert resp1.status_code == 201

    # Second review — should be rejected
    resp2 = await client.post(
        f"/api/v1/reviews/shops/{shop_id}",
        headers=auth_headers,
        json={"rating": 3, "text": "Changed my mind"},
    )
    assert resp2.status_code == 409


# =============================================================================
# Test: Wishlist add and list
# =============================================================================

@pytest.mark.asyncio
async def test_wishlist_operations(client: AsyncClient, auth_headers: dict):
    """Users should be able to add and list wishlist items."""
    # Add item
    add_resp = await client.post(
        "/api/v1/wishlist",
        headers=auth_headers,
        json={"product_name": "Organic Honey", "target_price": 19.99},
    )
    assert add_resp.status_code == 201
    assert add_resp.json()["product_name"] == "Organic Honey"

    # List wishlist
    list_resp = await client.get("/api/v1/wishlist", headers=auth_headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # Delete item
    item_id = add_resp.json()["id"]
    del_resp = await client.delete(f"/api/v1/wishlist/{item_id}", headers=auth_headers)
    assert del_resp.status_code == 204


# =============================================================================
# Test: Chat message persistence
# =============================================================================

@pytest.mark.asyncio
async def test_chat_message_persistence(client: AsyncClient, auth_headers: dict, shop_owner_headers: dict):
    """Messages sent in a conversation should be persisted and retrievable."""
    owner_headers = {k: v for k, v in shop_owner_headers.items() if k == "Authorization"}
    participant_id = shop_owner_headers.get("user_id")

    if not participant_id:
        pytest.skip("Could not get shop owner user_id")

    # Create conversation
    conv_resp = await client.post(
        "/api/v1/chat/conversations",
        headers=auth_headers,
        json={"participant_id": participant_id},
    )
    assert conv_resp.status_code == 201
    conversation_id = conv_resp.json()["id"]

    # Send message
    msg_resp = await client.post(
        f"/api/v1/chat/conversations/{conversation_id}/messages",
        headers=auth_headers,
        json={"text": "Hello, do you have honey?"},
    )
    assert msg_resp.status_code == 201
    assert msg_resp.json()["text"] == "Hello, do you have honey?"

    # Get messages
    msgs_resp = await client.get(
        f"/api/v1/chat/conversations/{conversation_id}/messages",
        headers=auth_headers,
    )
    assert msgs_resp.status_code == 200
    assert msgs_resp.json()["total"] >= 1


# =============================================================================
# Test: Notifications
# =============================================================================

@pytest.mark.asyncio
async def test_notification_list(client: AsyncClient, auth_headers: dict):
    """Authenticated users should be able to list their notifications."""
    response = await client.get("/api/v1/notifications", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "notifications" in data
    assert "total" in data
    assert "unread_count" in data


# =============================================================================
# Test: Health check
# =============================================================================

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """The health endpoint should return healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
