"""
Helpers for validating and saving uploaded image files.
"""

import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


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

    target_dir = get_upload_storage_dir() / subdirectory
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    target_file = target_dir / filename
    target_file.write_bytes(content)

    return f"/{settings.UPLOAD_DIR}/{subdirectory}/{filename}"
