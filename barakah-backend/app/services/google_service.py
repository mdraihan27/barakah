"""
Google OAuth helper — exchanges authorization codes for user profile info.
Uses httpx for async HTTP calls to Google APIs.
"""

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Google OAuth endpoints
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


async def get_google_auth_url() -> str:
    """Build the Google OAuth consent screen URL."""
    settings = get_settings()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    logger.debug("Generated Google auth URL")
    return url


async def exchange_google_code(code: str) -> dict:
    """
    Exchange the authorization code for tokens, then fetch user info.
    Returns a dict with email, given_name, family_name, picture, etc.
    """
    settings = get_settings()
    logger.info("Exchanging Google authorization code")

    # Step 1 — exchange code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        logger.error("Google token exchange failed: %s", token_resp.text)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google.",
        )

    access_token = token_resp.json().get("access_token")
    if not access_token:
        logger.error("No access_token in Google response")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google response.",
        )

    # Step 2 — fetch user profile
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if user_resp.status_code != 200:
        logger.error("Google userinfo request failed: %s", user_resp.text)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch Google user info.",
        )

    user_info = user_resp.json()
    logger.info("Google user info retrieved for: %s", user_info.get("email"))
    return user_info
