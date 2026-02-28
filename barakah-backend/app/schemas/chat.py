"""
Pydantic schemas for chat-related request / response payloads.
Handles conversations and messages.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class ConversationCreateRequest(BaseModel):
    """Payload for starting a new conversation."""
    participant_id: str = Field(..., description="User ID of the other participant")


class MessageCreateRequest(BaseModel):
    """Payload for sending a message."""
    text: str = Field(..., min_length=1, max_length=5000)


# =============================================================================
# Response Schemas
# =============================================================================

class MessageResponse(BaseModel):
    """Single chat message."""
    id: str = Field(..., alias="_id")
    conversation_id: str
    sender_id: str
    text: str
    created_at: datetime

    class Config:
        populate_by_name = True


class ConversationResponse(BaseModel):
    """Conversation summary."""
    id: str = Field(..., alias="_id")
    participants: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        populate_by_name = True


class ConversationListResponse(BaseModel):
    """List of conversations."""
    conversations: List[ConversationResponse]
    total: int


class MessageListResponse(BaseModel):
    """List of messages in a conversation."""
    messages: List[MessageResponse]
    total: int
