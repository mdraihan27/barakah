"""
Upload routes for shop/product images.
"""

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core.dependencies import require_role
from app.utils.file_upload import build_public_file_url, save_image

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/shop-image", summary="Upload a shop image")
async def upload_shop_image(
    request: Request,
    image: UploadFile = File(...),
    current_user: dict = Depends(require_role("shop_owner", "admin")),
):
    _ = current_user
    relative_path = await save_image(image, "shops")
    public_url = build_public_file_url(str(request.base_url), relative_path)
    return {"url": public_url}


@router.post("/product-images", summary="Upload product images")
async def upload_product_images(
    request: Request,
    images: list[UploadFile] = File(...),
    current_user: dict = Depends(require_role("shop_owner", "admin")),
):
    _ = current_user
    urls = []
    for image in images:
        relative_path = await save_image(image, "products")
        urls.append(build_public_file_url(str(request.base_url), relative_path))
    return {"urls": urls}
