"""
Helpers for validating and saving uploaded image files.
"""

import hashlib
import os
from pathlib import Path
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


def _cloudinary_enabled() -> bool:
    has_cloud_name = bool(getattr(settings, "CLOUDINARY_CLOUD_NAME", ""))
    has_unsigned = bool(getattr(settings, "CLOUDINARY_UPLOAD_PRESET", ""))
    has_signed = bool(
        getattr(settings, "CLOUDINARY_API_KEY", "")
        and getattr(settings, "CLOUDINARY_API_SECRET", "")
    )
    return has_cloud_name and (has_unsigned or has_signed)


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


def get_upload_storage_dir() -> Path:
    """
    Resolve the writable filesystem directory for uploaded files.

    On Vercel, the deployment filesystem is read-only except /tmp.
    """
    configured_dir = Path(settings.UPLOAD_DIR)
    if configured_dir.is_absolute():
        return configured_dir

    if os.getenv("VERCEL") == "1":
        return Path("/tmp") / configured_dir

    return configured_dir


def _validate_image(file: UploadFile) -> str:
    extension = Path(file.filename or "").suffix.lower()
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
    Validate and save an image to <UPLOAD_DIR>/<subdirectory> and return relative path.
    """
    extension = _validate_image(file)

    content = await file.read()
    max_size_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large. Max size is {settings.MAX_IMAGE_SIZE_MB}MB.",
        )

    if _cloudinary_enabled():
        filename = f"{uuid4().hex}{extension}"
        return await _upload_to_cloudinary(content, filename, file.content_type or "", subdirectory)

    target_dir = get_upload_storage_dir() / subdirectory
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    target_file = target_dir / filename
    target_file.write_bytes(content)

    return f"/{settings.UPLOAD_DIR}/{subdirectory}/{filename}"
