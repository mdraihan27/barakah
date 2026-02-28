"""
Chat service — business logic for conversations, messages, and
an in-memory WebSocket connection manager for real-time broadcast.
"""

import json
from typing import Dict, List

from fastapi import HTTPException, WebSocket, status

from app.core.logging import get_logger
from app.repositories.chat_repository import ChatRepository

logger = get_logger(__name__)


# =============================================================================
# In-Memory WebSocket Connection Manager
# =============================================================================

class ConnectionManager:
    """
    Manages active WebSocket connections per conversation.
    Enables real-time message broadcast to all participants.
    """

    def __init__(self):
        # {conversation_id: [WebSocket, ...]}
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, conversation_id: str, ws: WebSocket) -> None:
        """Accept and register a WebSocket connection."""
        await ws.accept()
        self._connections.setdefault(conversation_id, []).append(ws)
        logger.info(
            "WebSocket connected: conversation %s (total: %d)",
            conversation_id, len(self._connections[conversation_id]),
        )

    def disconnect(self, conversation_id: str, ws: WebSocket) -> None:
        """Remove a WebSocket connection."""
        conns = self._connections.get(conversation_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._connections.pop(conversation_id, None)
        logger.info("WebSocket disconnected: conversation %s", conversation_id)

    async def broadcast(self, conversation_id: str, message: dict) -> None:
        """
        Send a message to all connected clients in a conversation.
        Silently removes dead connections.
        """
        conns = self._connections.get(conversation_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)

        # Clean up dead connections
        for ws in dead:
            self.disconnect(conversation_id, ws)


# Singleton connection manager — shared across all WebSocket endpoints
connection_manager = ConnectionManager()


# =============================================================================
# Chat Service
# =============================================================================

class ChatService:
    """Business logic for conversations and messages."""

    def __init__(self, chat_repo: ChatRepository):
        self.chat_repo = chat_repo

    # ── Conversations ────────────────────────────────────────────────────

    async def create_or_get_conversation(self, user_id: str, participant_id: str) -> dict:
        """
        Start a conversation between two users.
        Returns existing conversation if one already exists.
        """
        if user_id == participant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start a conversation with yourself.",
            )

        # Check for existing conversation
        existing = await self.chat_repo.find_conversation_between(user_id, participant_id)
        if existing:
            logger.info("Existing conversation found: %s", existing["_id"])
            return existing

        conversation = await self.chat_repo.create_conversation([user_id, participant_id])
        logger.info("New conversation created: %s", conversation["_id"])
        return conversation

    async def get_user_conversations(self, user_id: str) -> dict:
        """Get all conversations for a user."""
        conversations = await self.chat_repo.find_user_conversations(user_id)
        return {"conversations": conversations, "total": len(conversations)}

    # ── Messages ─────────────────────────────────────────────────────────

    async def send_message(
        self, conversation_id: str, sender_id: str, text: str
    ) -> dict:
        """
        Save a message and broadcast it to connected participants.
        Validates the sender is a participant of the conversation.
        """
        conversation = await self._get_conversation_or_404(conversation_id)
        self._assert_participant(conversation, sender_id)

        message_doc = {
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "text": text,
        }
        message = await self.chat_repo.save_message(message_doc)

        # Broadcast to connected WebSocket clients
        await connection_manager.broadcast(conversation_id, {
            "_id": message["_id"],
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "text": text,
            "created_at": str(message["created_at"]),
        })

        logger.info(
            "Message sent in conversation %s by user %s",
            conversation_id, sender_id,
        )
        return message

    async def get_messages(
        self, conversation_id: str, user_id: str, skip: int = 0, limit: int = 50
    ) -> dict:
        """Get messages in a conversation. User must be a participant."""
        conversation = await self._get_conversation_or_404(conversation_id)
        self._assert_participant(conversation, user_id)

        messages = await self.chat_repo.get_messages(conversation_id, skip=skip, limit=limit)
        total = await self.chat_repo.count_messages(conversation_id)
        return {"messages": messages, "total": total}

    # ── WebSocket Auth ───────────────────────────────────────────────────

    async def verify_ws_participant(self, conversation_id: str, user_id: str) -> dict:
        """Verify a user is a participant of the conversation (for WebSocket auth)."""
        conversation = await self._get_conversation_or_404(conversation_id)
        self._assert_participant(conversation, user_id)
        return conversation

    # ── Internal helpers ─────────────────────────────────────────────────

    async def _get_conversation_or_404(self, conversation_id: str) -> dict:
        """Fetch conversation or raise 404."""
        conversation = await self.chat_repo.find_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )
        return conversation

    @staticmethod
    def _assert_participant(conversation: dict, user_id: str) -> None:
        """Raise 403 if user is not a participant."""
        if user_id not in conversation.get("participants", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation.",
            )
