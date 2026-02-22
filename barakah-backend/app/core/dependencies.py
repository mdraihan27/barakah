"""
FastAPI dependency injection helpers.
Provides reusable Depends() callables for routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_database
from app.core.logging import get_logger
from app.utils.security import decode_access_token

logger = get_logger(__name__)

# Bearer token extractor
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_db():
    """Yield the MongoDB database instance."""
    return get_database()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db=Depends(get_db),
):
    """
    Extract and validate the JWT from the Authorization header.
    Returns the full user document from the database.
    """
    if credentials is None:
        logger.warning("Missing authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    # Decode the token — raises HTTPException on failure
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        logger.warning("Token payload missing 'sub' claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    # Fetch user from DB
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    user = await user_repo.find_by_id(user_id)

    if not user:
        logger.warning("Token references non-existent user: %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    if not user.get("is_active", False):
        logger.warning("Inactive user tried to authenticate: %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user
