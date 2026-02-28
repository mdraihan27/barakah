"""
Pydantic schemas for review-related request / response payloads.
Handles review creation, listing, and shop rating display.
"""

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class ReviewCreateRequest(BaseModel):
    """Payload for creating a review on a shop."""
    rating: int = Field(..., ge=1, le=5, examples=[4])
    text: str = Field("", max_length=2000, examples=["Great shop, fresh products!"])


# =============================================================================
# Response Schemas
# =============================================================================

class ReviewResponse(BaseModel):
    """Public-facing review representation."""
    id: str = Field(..., alias="_id")
    user_id: str
    shop_id: str
    rating: int
    text: str = ""
    reviewer_name: str = ""
    created_at: datetime

    class Config:
        populate_by_name = True


class ReviewListResponse(BaseModel):
    """List of reviews for a shop."""
    reviews: List[ReviewResponse]
    total: int
    average_rating: float = 0.0
