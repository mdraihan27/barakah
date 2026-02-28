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


# =============================================================================
# Response Schemas
# =============================================================================

class WishlistItemResponse(BaseModel):
    """Single wishlist item."""
    id: str = Field(..., alias="_id")
    user_id: str
    product_name: str
    target_price: Optional[float] = None
    created_at: datetime

    class Config:
        populate_by_name = True


class WishlistResponse(BaseModel):
    """User's full wishlist."""
    items: List[WishlistItemResponse]
    total: int
