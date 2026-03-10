"""
Pydantic schemas for shop-related request / response payloads.
Validates GeoJSON location, shop fields, and pagination.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Nested Schemas
# =============================================================================

class LocationSchema(BaseModel):
    """GeoJSON Point — MongoDB-compatible location format."""
    type: str = Field(default="Point", description="GeoJSON type (always 'Point')")
    coordinates: List[float] = Field(
        ...,
        min_length=2,
        max_length=2,
        description="[longitude, latitude]",
        examples=[[90.4125, 23.8103]],
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v != "Point":
            raise ValueError("Location type must be 'Point'")
        return v

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v: List[float]) -> List[float]:
        lng, lat = v
        if not (-180 <= lng <= 180):
            raise ValueError(f"Longitude must be between -180 and 180, got {lng}")
        if not (-90 <= lat <= 90):
            raise ValueError(f"Latitude must be between -90 and 90, got {lat}")
        return v


class AddressSchema(BaseModel):
    """Structured address for a shop."""
    street: str = Field("", max_length=200)
    city: str = Field("", max_length=100)
    state: str = Field("", max_length=100)
    country: str = Field("", max_length=100)
    postal_code: str = Field("", max_length=20)


# =============================================================================
# Request Schemas
# =============================================================================

class ShopCreateRequest(BaseModel):
    """Payload for creating a new shop."""
    name: str = Field(..., min_length=2, max_length=100, examples=["Barakah Grocery"])
    description: str = Field("", max_length=1000, examples=["Fresh halal groceries"])
    category: str = Field(..., min_length=2, max_length=50, examples=["grocery"])
    image_url: str = Field("", max_length=2048, examples=["https://res.cloudinary.com/demo/image/upload/v1/barakah/shops/shop.jpg"])
    location: LocationSchema
    address: AddressSchema = Field(default_factory=AddressSchema)


class ShopUpdateRequest(BaseModel):
    """Payload for updating an existing shop — all fields optional."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    image_url: Optional[str] = Field(None, max_length=2048)
    location: Optional[LocationSchema] = None
    address: Optional[AddressSchema] = None
    is_active: Optional[bool] = None


# =============================================================================
# Response Schemas
# =============================================================================

class ShopResponse(BaseModel):
    """Public-facing shop representation."""
    id: str = Field(..., alias="_id")
    owner_id: str
    name: str
    description: str = ""
    category: str
    image_url: str = ""
    location: LocationSchema
    address: AddressSchema = Field(default_factory=AddressSchema)
    rating_average: float = 0.0
    total_reviews: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class ShopListResponse(BaseModel):
    """Paginated list of shops."""
    shops: List[ShopResponse]
    total: int
