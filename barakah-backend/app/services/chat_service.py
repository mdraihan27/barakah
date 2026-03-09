"""
Chat service — business logic for conversations, messages, and
an in-memory WebSocket connection manager for real-time broadcast.
"""

import json
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import HTTPException, WebSocket, status

from app.core.logging import get_logger
from app.repositories.chat_repository import ChatRepository
from app.repositories.user_repository import UserRepository

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
        self._conversation_connections: Dict[str, List[WebSocket]] = {}
        # {user_id: [WebSocket, ...]}
        self._user_connections: Dict[str, List[WebSocket]] = {}

    async def connect_conversation(self, conversation_id: str, ws: WebSocket) -> None:
        """Accept and register a conversation-scoped WebSocket connection."""
        await ws.accept()
        self._conversation_connections.setdefault(conversation_id, []).append(ws)
        logger.info(
            "WebSocket connected: conversation %s (total: %d)",
            conversation_id, len(self._conversation_connections[conversation_id]),
        )

    async def connect_user(self, user_id: str, ws: WebSocket) -> None:
        """Accept and register a user-scoped WebSocket connection."""
        await ws.accept()
        self._user_connections.setdefault(user_id, []).append(ws)
        logger.info("User WebSocket connected: %s (total: %d)", user_id, len(self._user_connections[user_id]))

    def disconnect_conversation(self, conversation_id: str, ws: WebSocket) -> None:
        """Remove a conversation-scoped WebSocket connection."""
        conns = self._conversation_connections.get(conversation_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._conversation_connections.pop(conversation_id, None)
        logger.info("WebSocket disconnected: conversation %s", conversation_id)

    def disconnect_user(self, user_id: str, ws: WebSocket) -> None:
        """Remove a user-scoped WebSocket connection."""
        conns = self._user_connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._user_connections.pop(user_id, None)
        logger.info("User WebSocket disconnected: %s", user_id)

    async def broadcast_conversation(self, conversation_id: str, message: dict) -> None:
        """
        Send a message to all connected clients in a conversation.
        Silently removes dead connections.
        """
        conns = self._conversation_connections.get(conversation_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)

        # Clean up dead connections
        for ws in dead:
            self.disconnect_conversation(conversation_id, ws)

    async def send_user_event(self, user_id: str, event: dict) -> None:
        """Send a user-scoped event to all sockets for that user."""
        conns = self._user_connections.get(user_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(event, default=str))
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect_user(user_id, ws)


# Singleton connection manager — shared across all WebSocket endpoints
connection_manager = ConnectionManager()


# =============================================================================
# Chat Service
# =============================================================================

class ChatService:
    """Business logic for conversations and messages."""

    def __init__(self, chat_repo: ChatRepository, user_repo: UserRepository):
        self.chat_repo = chat_repo
        self.user_repo = user_repo

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
            return await self._decorate_conversation(existing, user_id)

        conversation = await self.chat_repo.create_conversation([user_id, participant_id])
        logger.info("New conversation created: %s", conversation["_id"])
        return await self._decorate_conversation(conversation, user_id)

    async def get_user_conversations(self, user_id: str) -> dict:
        """Get all conversations for a user."""
        conversations = await self.chat_repo.find_user_conversations(user_id)
        decorated = []
        for conversation in conversations:
            decorated.append(await self._decorate_conversation(conversation, user_id))
        return {"conversations": decorated, "total": len(decorated)}

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
        recipient_ids = [participant for participant in conversation.get("participants", []) if participant != sender_id]

        message_doc = {
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "text": text,
        }
        message = await self.chat_repo.save_message(message_doc, recipient_ids=recipient_ids)

        # Broadcast to active room sockets.
        room_event = {
            "type": "message.new",
            "payload": {
                "_id": message["_id"],
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "text": text,
                "seen_by": message.get("seen_by", [sender_id]),
                "seen_at": message.get("seen_at"),
                "created_at": message["created_at"],
            },
        }
        await connection_manager.broadcast_conversation(conversation_id, room_event)

        # Broadcast user-level unread updates for side-nav indicators.
        participant_ids = conversation.get("participants", [])
        for participant_id in participant_ids:
            unread_total = await self.chat_repo.get_unread_total(participant_id)
            unread_in_conversation = int(conversation.get("unread_counts", {}).get(participant_id, 0))
            if participant_id in recipient_ids:
                unread_in_conversation += 1
            await connection_manager.send_user_event(
                participant_id,
                {
                    "type": "chat.unread",
                    "payload": {
                        "conversation_id": conversation_id,
                        "unread_count": unread_in_conversation,
                        "total_unread": unread_total,
                        "last_message": text,
                        "last_message_sender_id": sender_id,
                        "last_message_at": message["created_at"],
                    },
                },
            )

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

    async def mark_conversation_read(self, conversation_id: str, user_id: str) -> dict:
        """Mark incoming messages as seen and broadcast read receipts."""
        conversation = await self._get_conversation_or_404(conversation_id)
        self._assert_participant(conversation, user_id)

        result = await self.chat_repo.mark_messages_seen(conversation_id, user_id)
        if result.get("updated_count", 0) > 0:
            await connection_manager.broadcast_conversation(
                conversation_id,
                {
                    "type": "message.seen",
                    "payload": {
                        "conversation_id": conversation_id,
                        "seen_by": user_id,
                        "last_seen_message_id": result.get("last_seen_message_id"),
                        "updated_count": result.get("updated_count", 0),
                        "seen_at": datetime.now(timezone.utc),
                    },
                },
            )

        unread_total = await self.chat_repo.get_unread_total(user_id)
        await connection_manager.send_user_event(
            user_id,
            {
                "type": "chat.unread",
                "payload": {
                    "conversation_id": conversation_id,
                    "unread_count": 0,
                    "total_unread": unread_total,
                },
            },
        )
        return result

    async def get_unread_summary(self, user_id: str) -> dict:
        """Return unread total for side-nav red dot."""
        total_unread = await self.chat_repo.get_unread_total(user_id)
        return {"total_unread": total_unread}

    async def get_conversation(self, conversation_id: str, user_id: str) -> dict:
        """Get a single conversation summary with participant profile data."""
        conversation = await self._get_conversation_or_404(conversation_id)
        self._assert_participant(conversation, user_id)
        return await self._decorate_conversation(conversation, user_id)

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

    async def _decorate_conversation(self, conversation: dict, viewer_id: str) -> dict:
        """Attach lightweight participant profiles and viewer-specific unread count."""
        participant_ids = conversation.get("participants", [])
        users = await self.user_repo.find_by_ids(participant_ids)
        users_by_id = {user["_id"]: user for user in users}

        participants = []
        for participant_id in participant_ids:
            user = users_by_id.get(participant_id)
            participants.append(
                {
                    "_id": participant_id,
                    "first_name": user.get("first_name", "") if user else "",
                    "last_name": user.get("last_name", "") if user else "",
                    "avatar_url": user.get("avatar_url") if user else None,
                }
            )

        decorated = dict(conversation)
        decorated["participants"] = participants
        decorated["unread_count"] = int(conversation.get("unread_counts", {}).get(viewer_id, 0))
        return decorated
