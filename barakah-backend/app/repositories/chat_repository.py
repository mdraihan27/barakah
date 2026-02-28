"""
Chat repository — all MongoDB operations for conversations and messages.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logging import get_logger

logger = get_logger(__name__)

_CONVERSATIONS = "conversations"
_MESSAGES = "messages"


class ChatRepository:
    """Data-access layer for the *conversations* and *messages* collections."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.conversations = db[_CONVERSATIONS]
        self.messages = db[_MESSAGES]

    # ── Conversation Operations ──────────────────────────────────────────

    async def create_conversation(self, participants: List[str]) -> dict:
        """Create a new conversation between participants."""
        now = datetime.now(timezone.utc)
        doc = {
            "participants": sorted(participants),
            "last_message": None,
            "last_message_at": None,
            "created_at": now,
        }
        result = await self.conversations.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        logger.info("Conversation created: %s between %s", doc["_id"], participants)
        return doc

    async def find_conversation_by_id(self, conversation_id: str) -> Optional[dict]:
        """Find a conversation by its ObjectId."""
        try:
            doc = await self.conversations.find_one({"_id": ObjectId(conversation_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as exc:
            logger.error("find_conversation_by_id failed: %s", exc)
            return None

    async def find_conversation_between(self, user_a: str, user_b: str) -> Optional[dict]:
        """Check if a conversation already exists between two users."""
        participants = sorted([user_a, user_b])
        doc = await self.conversations.find_one({"participants": participants})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def find_user_conversations(self, user_id: str) -> List[dict]:
        """Get all conversations for a user, most recent first."""
        cursor = (
            self.conversations.find({"participants": user_id})
            .sort("last_message_at", -1)
        )
        conversations = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            conversations.append(doc)
        return conversations

    # ── Message Operations ───────────────────────────────────────────────

    async def save_message(self, message_data: dict) -> dict:
        """
        Save a message and update the conversation's last_message metadata.
        """
        now = datetime.now(timezone.utc)
        message_data["created_at"] = now

        # Insert message
        result = await self.messages.insert_one(message_data)
        message_data["_id"] = str(result.inserted_id)

        # Update conversation last_message
        await self.conversations.update_one(
            {"_id": ObjectId(message_data["conversation_id"])},
            {
                "$set": {
                    "last_message": message_data["text"][:100],
                    "last_message_at": now,
                }
            },
        )

        logger.debug(
            "Message saved: %s in conversation %s",
            message_data["_id"], message_data["conversation_id"],
        )
        return message_data

    async def get_messages(
        self, conversation_id: str, skip: int = 0, limit: int = 50
    ) -> List[dict]:
        """Get messages in a conversation, newest first."""
        cursor = (
            self.messages.find({"conversation_id": conversation_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        messages = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            messages.append(doc)
        return messages

    async def count_messages(self, conversation_id: str) -> int:
        """Count messages in a conversation."""
        return await self.messages.count_documents({"conversation_id": conversation_id})

    # ── Indexes ──────────────────────────────────────────────────────────

    async def ensure_indexes(self) -> None:
        """Create required indexes on chat collections."""
        await self.conversations.create_index("participants")
        await self.messages.create_index([("conversation_id", 1), ("created_at", -1)])
        logger.info("Chat collection indexes ensured.")
