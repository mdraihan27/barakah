"""
Chat routes — /api/v1/chat/* HTTP + WebSocket endpoints.
Supports REST for conversation/message management and
WebSocket for real-time messaging.
"""

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status

from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationListResponse,
    ConversationResponse,
    MessageCreateRequest,
    MessageListResponse,
    MessageResponse,
)
from app.services.chat_service import ChatService, connection_manager
from app.utils.security import decode_access_token

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _chat_service(db=Depends(get_db)) -> ChatService:
    return ChatService(ChatRepository(db))


# =============================================================================
# Create / Get Conversation (authenticated)
# =============================================================================

@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a conversation",
)
async def create_conversation(
    body: ConversationCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(_chat_service),
):
    """Start a conversation with another user (or return existing one)."""
    logger.info(
        "POST /chat/conversations — user %s → %s",
        current_user["_id"], body.participant_id,
    )
    conversation = await service.create_or_get_conversation(
        user_id=current_user["_id"],
        participant_id=body.participant_id,
    )
    return ConversationResponse(**conversation)


# =============================================================================
# List My Conversations (authenticated)
# =============================================================================

@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List my conversations",
)
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(_chat_service),
):
    """Get all conversations for the authenticated user."""
    logger.info("GET /chat/conversations — user %s", current_user["_id"])
    result = await service.get_user_conversations(current_user["_id"])
    return ConversationListResponse(
        conversations=[ConversationResponse(**c) for c in result["conversations"]],
        total=result["total"],
    )


# =============================================================================
# Send Message (authenticated)
# =============================================================================

@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
)
async def send_message(
    conversation_id: str,
    body: MessageCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(_chat_service),
):
    """Send a message in a conversation. Also broadcast via WebSocket."""
    logger.info(
        "POST /chat/conversations/%s/messages — user %s",
        conversation_id, current_user["_id"],
    )
    message = await service.send_message(
        conversation_id=conversation_id,
        sender_id=current_user["_id"],
        text=body.text,
    )
    return MessageResponse(**message)


# =============================================================================
# Get Messages (authenticated)
# =============================================================================

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="Get conversation messages",
)
async def get_messages(
    conversation_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(_chat_service),
):
    """Get messages in a conversation. User must be a participant."""
    logger.info(
        "GET /chat/conversations/%s/messages — user %s",
        conversation_id, current_user["_id"],
    )
    result = await service.get_messages(
        conversation_id=conversation_id,
        user_id=current_user["_id"],
        skip=skip,
        limit=limit,
    )
    return MessageListResponse(
        messages=[MessageResponse(**m) for m in result["messages"]],
        total=result["total"],
    )


# =============================================================================
# WebSocket — Real-Time Chat
# =============================================================================

@router.websocket("/ws/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time chat.

    Flow:
    1. Authenticate via token query param
    2. Verify user is a participant
    3. Accept connection
    4. On receive: save message → broadcast to all participants
    5. On disconnect: clean up connection
    """
    # ── Authenticate via JWT ──
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # ── Build service (manual DI — no Depends() in WebSocket) ──
    from app.core.database import get_database
    db = get_database()
    chat_repo = ChatRepository(db)
    service = ChatService(chat_repo)

    # ── Verify participant ──
    try:
        await service.verify_ws_participant(conversation_id, user_id)
    except Exception:
        await websocket.close(code=4003, reason="Not a participant")
        return

    # ── Accept and manage connection ──
    await connection_manager.connect(conversation_id, websocket)
    logger.info("WebSocket connected: user %s in conversation %s", user_id, conversation_id)

    try:
        while True:
            data = await websocket.receive_text()

            # Save and broadcast the message
            await service.send_message(
                conversation_id=conversation_id,
                sender_id=user_id,
                text=data,
            )
    except WebSocketDisconnect:
        connection_manager.disconnect(conversation_id, websocket)
        logger.info("WebSocket disconnected: user %s from conversation %s", user_id, conversation_id)
    except Exception as exc:
        connection_manager.disconnect(conversation_id, websocket)
        logger.error("WebSocket error: %s", exc)
