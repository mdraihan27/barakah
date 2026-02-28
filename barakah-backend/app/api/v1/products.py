"""
Product routes — all /api/v1/products/* endpoints.
Thin controller layer: validates input, delegates to ProductService.
"""

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_db, require_role
from app.core.logging import get_logger
from app.repositories.product_repository import ProductRepository
from app.repositories.shop_repository import ShopRepository
from app.schemas.product import (
    ProductCreateRequest,
    ProductListResponse,
    ProductPriceHistoryResponse,
    ProductPriceUpdateRequest,
    ProductResponse,
    ProductUpdateRequest,
)
from app.services.product_service import ProductService

logger = get_logger(__name__)

router = APIRouter(prefix="/products", tags=["Products"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _product_service(db=Depends(get_db)) -> ProductService:
    return ProductService(ProductRepository(db), ShopRepository(db))


# =============================================================================
# Create Product (shop_owner / admin only)
# =============================================================================

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
)
async def create_product(
    body: ProductCreateRequest,
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ProductService = Depends(_product_service),
):
    """Add a product to a shop. Requires ownership of the target shop."""
    logger.info("POST /products — user %s, shop %s", current_user["_id"], body.shop_id)
    product = await service.create_product(user=current_user, data=body.model_dump())
    return ProductResponse(**product)


# =============================================================================
# Update Product (shop_owner / admin only)
# =============================================================================

@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update a product",
)
async def update_product(
    product_id: str,
    body: ProductUpdateRequest,
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ProductService = Depends(_product_service),
):
    """Update product details. Only the shop owner or admin can modify."""
    logger.info("PATCH /products/%s — user %s", product_id, current_user["_id"])
    product = await service.update_product(
        product_id=product_id,
        user=current_user,
        data=body.model_dump(exclude_unset=True),
    )
    return ProductResponse(**product)


# =============================================================================
# Update Product Price (shop_owner / admin only)
# =============================================================================

@router.post(
    "/{product_id}/price",
    response_model=ProductResponse,
    summary="Update product price",
)
async def update_product_price(
    product_id: str,
    body: ProductPriceUpdateRequest,
    current_user: dict = Depends(require_role("shop_owner", "admin")),
    service: ProductService = Depends(_product_service),
):
    """Change the product's price. Records the change in price history."""
    logger.info("POST /products/%s/price — user %s", product_id, current_user["_id"])
    product = await service.update_price(
        product_id=product_id,
        user=current_user,
        new_price=body.new_price,
    )
    return ProductResponse(**product)


# =============================================================================
# Get Products by Shop (public)
# =============================================================================

@router.get(
    "/shop/{shop_id}",
    response_model=ProductListResponse,
    summary="List products by shop",
)
async def get_products_by_shop(
    shop_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: ProductService = Depends(_product_service),
):
    """Get all products for a specific shop. Public endpoint."""
    logger.info("GET /products/shop/%s", shop_id)
    result = await service.get_products_by_shop(shop_id, skip=skip, limit=limit)
    return ProductListResponse(
        products=[ProductResponse(**p) for p in result["products"]],
        total=result["total"],
    )


# =============================================================================
# Get Single Product (public)
# =============================================================================

@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product details",
)
async def get_product(
    product_id: str,
    service: ProductService = Depends(_product_service),
):
    """Fetch a product by its ID. Public endpoint."""
    logger.info("GET /products/%s", product_id)
    product = await service.get_product(product_id)
    return ProductResponse(**product)


# =============================================================================
# Get Price History (public)
# =============================================================================

@router.get(
    "/{product_id}/price-history",
    response_model=ProductPriceHistoryResponse,
    summary="Get product price history",
)
async def get_price_history(
    product_id: str,
    service: ProductService = Depends(_product_service),
):
    """Retrieve the price history for a product. Public endpoint."""
    logger.info("GET /products/%s/price-history", product_id)
    result = await service.get_price_history(product_id)
    return ProductPriceHistoryResponse(**result)
