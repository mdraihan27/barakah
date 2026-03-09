"""
Pydantic schemas for product-related request / response payloads.
Handles product CRUD, price updates, and price history tracking.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class ProductCreateRequest(BaseModel):
    """Payload for creating a new product."""
    shop_id: str = Field(..., description="Shop this product belongs to")
    name: str = Field(..., min_length=2, max_length=200, examples=["Organic Honey"])
    description: str = Field("", max_length=2000, examples=["Pure organic wildflower honey"])
    category: str = Field(..., min_length=2, max_length=50, examples=["food"])
    images: List[str] = Field(default_factory=list, max_length=10, description="Image URLs")
    current_price: float = Field(..., gt=0, examples=[29.99])
    stock_quantity: int = Field(0, ge=0, examples=[100])


class ProductUpdateRequest(BaseModel):
    """Payload for updating an existing product — all fields optional."""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    images: Optional[List[str]] = Field(None, max_length=10)
    stock_quantity: Optional[int] = Field(None, ge=0)


class ProductPriceUpdateRequest(BaseModel):
    """Payload for updating a product's price (triggers price history)."""
    new_price: float = Field(..., gt=0, examples=[24.99])


class ProductCatalogNameCreateRequest(BaseModel):
    """Add a new product name to the global catalog for a category."""
    category: str = Field(..., min_length=2, max_length=50, examples=["Rice"])
    name: str = Field(..., min_length=2, max_length=200, examples=["Miniket Rice"])


# =============================================================================
# Response Schemas
# =============================================================================

class PriceHistoryEntry(BaseModel):
    """Single entry in a product's price history."""
    price: float
    recorded_at: datetime


class ProductResponse(BaseModel):
    """Public-facing product representation."""
    id: str = Field(..., alias="_id")
    shop_id: str
    name: str
    description: str = ""
    category: str
    images: List[str] = Field(default_factory=list)
    current_price: float
    stock_quantity: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class ProductListResponse(BaseModel):
    """List of products."""
    products: List[ProductResponse]
    total: int


class ProductPriceHistoryResponse(BaseModel):
    """Price history for a specific product."""
    product_id: str
    history: List[PriceHistoryEntry]


class ProductCatalogCategoriesResponse(BaseModel):
    """Global product categories for product-name selection."""
    categories: List[str]


class ProductCatalogNamesResponse(BaseModel):
    """Global product names under one category."""
    category: str
    names: List[str]
