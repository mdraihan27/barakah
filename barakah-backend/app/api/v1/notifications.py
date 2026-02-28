"""
Notification routes — /api/v1/notifications/* endpoints.
All endpoints require authentication.
"""

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.user import MessageResponse
from app.services.notification_service import NotificationService

logger = get_logger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _notification_service(db=Depends(get_db)) -> NotificationService:
    return NotificationService(NotificationRepository(db))


# =============================================================================
# Get Notifications
# =============================================================================

@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get my notifications",
)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(_notification_service),
):
    """Get the authenticated user's notifications with unread count."""
    logger.info("GET /notifications — user %s", current_user["_id"])
    result = await service.get_user_notifications(
        current_user["_id"], skip=skip, limit=limit
    )
    return NotificationListResponse(
        notifications=[NotificationResponse(**n) for n in result["notifications"]],
        total=result["total"],
        unread_count=result["unread_count"],
    )


# =============================================================================
# Mark Single Notification as Read
# =============================================================================

@router.patch(
    "/{notification_id}/read",
    response_model=MessageResponse,
    summary="Mark notification as read",
)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(_notification_service),
):
    """Mark a single notification as read."""
    logger.info("PATCH /notifications/%s/read — user %s", notification_id, current_user["_id"])
    await service.mark_as_read(notification_id, current_user["_id"])
    return MessageResponse(message="Notification marked as read.")


# =============================================================================
# Mark All Notifications as Read
# =============================================================================

@router.post(
    "/read-all",
    response_model=MessageResponse,
    summary="Mark all notifications as read",
)
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(_notification_service),
):
    """Mark all of the user's unread notifications as read."""
    logger.info("POST /notifications/read-all — user %s", current_user["_id"])
    count = await service.mark_all_as_read(current_user["_id"])
    return MessageResponse(message=f"{count} notification(s) marked as read.")
