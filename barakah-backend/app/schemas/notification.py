"""
Pydantic schemas for notification-related request / response payloads.
Supports typed notifications with arbitrary payload data.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Response Schemas
# =============================================================================

class NotificationResponse(BaseModel):
    """Single notification."""
    id: str = Field(..., alias="_id")
    user_id: str
    type: str = Field(..., description="Notification type (e.g. 'price_drop', 'new_review')")
    title: str
    message: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True


class NotificationListResponse(BaseModel):
    """List of user notifications."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int = 0
