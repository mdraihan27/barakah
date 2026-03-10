"""
Helpers for validating and saving uploaded image files.
"""

import hashlib
import time
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def build_public_file_url(base_url: str, stored_path: str) -> str:
    """Return a public URL for a stored file path or URL."""
    if stored_path.startswith("http://") or stored_path.startswith("https://"):
        return stored_path
    return base_url.rstrip("/") + stored_path


def _assert_cloudinary_configured() -> None:
    has_cloud_name = bool(settings.CLOUDINARY_CLOUD_NAME)
    has_unsigned = bool(settings.CLOUDINARY_UPLOAD_PRESET)
    has_signed = bool(settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)

    if has_cloud_name and (has_unsigned or has_signed):
        return

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Image uploads are unavailable. Configure Cloudinary with "
            "CLOUDINARY_CLOUD_NAME plus CLOUDINARY_UPLOAD_PRESET or "
            "CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
        ),
    )


async def _upload_to_cloudinary(content: bytes, filename: str, content_type: str, subdirectory: str) -> str:
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    upload_preset = settings.CLOUDINARY_UPLOAD_PRESET
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    base_folder = (settings.CLOUDINARY_FOLDER or "barakah").strip("/")
    folder = f"{base_folder}/{subdirectory}" if base_folder else subdirectory

    endpoint = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    data = {"folder": folder}

    if upload_preset:
        data["upload_preset"] = upload_preset
    else:
        timestamp = int(time.time())
        signing_fields = {"folder": folder, "timestamp": timestamp}
        signing_base = "&".join(f"{k}={v}" for k, v in sorted(signing_fields.items()))
        signature = hashlib.sha1(f"{signing_base}{api_secret}".encode("utf-8")).hexdigest()
        data.update({
            "timestamp": timestamp,
            "api_key": api_key,
            "signature": signature,
        })

    files = {
        "file": (filename, content, content_type or "application/octet-stream"),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(endpoint, data=data, files=files)

    if response.status_code != 200:
        logger.error("Cloudinary upload failed: %s", response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Please try again.",
        )

    secure_url = response.json().get("secure_url")
    if not secure_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload succeeded but URL missing.",
        )
    return secure_url


def _validate_image(file: UploadFile) -> str:
    extension = (file.filename or "").lower().rsplit(".", 1)
    extension = f".{extension[-1]}" if len(extension) > 1 else ""
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Allowed: .jpg, .jpeg, .png, .webp",
        )

    if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type. Only image files are allowed.",
        )
    return extension


async def save_image(file: UploadFile, subdirectory: str) -> str:
    """
    Validate and upload an image to Cloudinary.
    """
    _assert_cloudinary_configured()
    extension = _validate_image(file)

    content = await file.read()
    max_size_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large. Max size is {settings.MAX_IMAGE_SIZE_MB}MB.",
        )

    filename = f"{uuid4().hex}{extension}"
    return await _upload_to_cloudinary(content, filename, file.content_type or "", subdirectory)
