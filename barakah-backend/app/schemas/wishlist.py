"""
Pydantic schemas for wishlist-related request / response payloads.
Uses product_name for cross-shop matching instead of product ID.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class WishlistItemCreateRequest(BaseModel):
    """Payload for adding an item to the wishlist."""
    product_name: str = Field(
        ..., min_length=2, max_length=200,
        description="Product name for cross-shop matching",
        examples=["Organic Honey"],
    )
    target_price: Optional[float] = Field(
        None, gt=0,
        description="Alert when price drops to or below this",
        examples=[19.99],
    )
    baseline_price: Optional[float] = Field(
        None, gt=0,
        description="Starting reference price when item is wishlisted",
        examples=[29.99],
    )
    source_product_id: Optional[str] = Field(
        None,
        description="Product that user originally wishlisted",
    )
    source_shop_id: Optional[str] = Field(
        None,
        description="Shop where user originally wishlisted the product",
    )
    user_lat: Optional[float] = Field(None, ge=-90, le=90)
    user_lng: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: float = Field(
        10.0,
        ge=1.0,
        le=50.0,
        description="Nearby radius for lower-price alerts",
    )


# =============================================================================
# Response Schemas
# =============================================================================

class WishlistItemResponse(BaseModel):
    """Single wishlist item."""
    id: str = Field(..., alias="_id")
    user_id: str
    product_name: str
    target_price: Optional[float] = None
    baseline_price: Optional[float] = None
    source_product_id: Optional[str] = None
    source_shop_id: Optional[str] = None
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    radius_km: float = 10.0
    last_alerted_price: Optional[float] = None
    created_at: datetime

    class Config:
        populate_by_name = True


class WishlistResponse(BaseModel):
    """User's full wishlist."""
    items: List[WishlistItemResponse]
    total: int
