"""
Notification service — business logic for user notifications.
Provides a reusable `notify_user` method for other services (reviews, price monitor, etc.).
"""

import json
from typing import Dict, List, Optional

from fastapi import HTTPException, WebSocket, status

from app.core.logging import get_logger
from app.repositories.notification_repository import NotificationRepository

logger = get_logger(__name__)


class NotificationConnectionManager:
    """Tracks active notification websocket connections per user."""

    def __init__(self):
        self._user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._user_connections.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        conns = self._user_connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._user_connections.pop(user_id, None)

    async def send_user_event(self, user_id: str, event: dict) -> None:
        conns = self._user_connections.get(user_id, [])
        dead: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(event, default=str))
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(user_id, ws)


notification_connection_manager = NotificationConnectionManager()


class NotificationService:
    """Business logic for user notifications."""

    def __init__(self, notification_repo: NotificationRepository):
        self.notification_repo = notification_repo

    # ── Create (used by other services / background tasks) ───────────────

    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        payload: Optional[dict] = None,
    ) -> dict:
        """
        Create a notification for a user.
        Called by services (review, price monitor) — not directly by routes.
        """
        doc = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "payload": payload or {},
        }
        created = await self.notification_repo.create(doc)
        unread_count = await self.notification_repo.count_unread(user_id)
        await notification_connection_manager.send_user_event(
            user_id,
            {
                "type": "notification.new",
                "payload": {
                    "notification": created,
                    "unread_count": unread_count,
                },
            },
        )
        return created

    # ── Read ─────────────────────────────────────────────────────────────

    async def get_user_notifications(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> dict:
        """Get paginated notifications with unread count."""
        notifications = await self.notification_repo.find_by_user(user_id, skip=skip, limit=limit)
        total = await self.notification_repo.count_by_user(user_id)
        unread_count = await self.notification_repo.count_unread(user_id)

        return {
            "notifications": notifications,
            "total": total,
            "unread_count": unread_count,
        }

    # ── Mark Read ────────────────────────────────────────────────────────

    async def mark_as_read(self, notification_id: str, user_id: str) -> None:
        """Mark a single notification as read."""
        success = await self.notification_repo.mark_as_read(notification_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found or already read.",
            )
        unread_count = await self.notification_repo.count_unread(user_id)
        await notification_connection_manager.send_user_event(
            user_id,
            {
                "type": "notification.unread",
                "payload": {
                    "unread_count": unread_count,
                },
            },
        )
        logger.info("Notification %s marked as read by user %s", notification_id, user_id)

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user. Returns count."""
        count = await self.notification_repo.mark_all_as_read(user_id)
        await notification_connection_manager.send_user_event(
            user_id,
            {
                "type": "notification.unread",
                "payload": {
                    "unread_count": 0,
                },
            },
        )
        logger.info("Marked %d notifications as read for user %s", count, user_id)
        return count
