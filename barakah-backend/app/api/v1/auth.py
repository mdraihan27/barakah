"""
Authentication routes — all /api/v1/auth/* endpoints.
Thin controller layer: validates input, delegates to AuthService,
and shapes the response.
"""

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SendVerificationCodeRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService
from app.services.google_service import exchange_google_code, get_google_auth_url

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _auth_service(db=Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


# =============================================================================
# Signup
# =============================================================================

@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def signup(body: SignupRequest, service: AuthService = Depends(_auth_service)):
    """Create a new user with email + password."""
    logger.info("POST /auth/signup — %s", body.email)
    result = await service.signup(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        password=body.password,
        is_shop_owner=body.is_shop_owner,
    )
    return AuthResponse(
        user=UserResponse(**result["user"]),
        tokens=TokenResponse(**result["tokens"]),
    )


# =============================================================================
# Login
# =============================================================================

@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in with email and password",
)
async def login(body: LoginRequest, service: AuthService = Depends(_auth_service)):
    """Authenticate and receive a token pair."""
    logger.info("POST /auth/login — %s", body.email)
    result = await service.login(email=body.email, password=body.password)
    return AuthResponse(
        user=UserResponse(**result["user"]),
        tokens=TokenResponse(**result["tokens"]),
    )


# =============================================================================
# Email Verification
# =============================================================================

@router.post(
    "/send-verification-code",
    response_model=MessageResponse,
    summary="Send email verification code",
)
async def send_verification_code(
    body: SendVerificationCodeRequest,
    service: AuthService = Depends(_auth_service),
):
    """Send a 6-digit verification code to the user's email."""
    logger.info("POST /auth/send-verification-code — %s", body.email)
    await service.send_verification_code(email=body.email)
    return MessageResponse(message="Verification code sent. Please check your email.")


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email with code",
)
async def verify_email(
    body: VerifyEmailRequest,
    service: AuthService = Depends(_auth_service),
):
    """Validate the 6-digit code and mark the email as verified."""
    logger.info("POST /auth/verify-email — %s", body.email)
    await service.verify_email(email=body.email, code=body.code)
    return MessageResponse(message="Email verified successfully.")


# =============================================================================
# Password Reset
# =============================================================================

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Send password reset code",
)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
):
    """Send a 6-digit password-reset code to the user's email."""
    logger.info("POST /auth/forgot-password — %s", body.email)
    await service.send_reset_code(email=body.email)
    # Always return success (don't leak whether the email exists)
    return MessageResponse(message="If that email is registered, a reset code has been sent.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with code",
)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(_auth_service),
):
    """Validate the reset code and set a new password."""
    logger.info("POST /auth/reset-password — %s", body.email)
    await service.reset_password(email=body.email, code=body.code, new_password=body.new_password)
    return MessageResponse(message="Password has been reset successfully.")


# =============================================================================
# Google OAuth
# =============================================================================

@router.get(
    "/google",
    summary="Get Google OAuth URL",
)
async def google_auth():
    """Redirect directly to the Google consent screen URL."""
    logger.info("GET /auth/google")
    url = await get_google_auth_url()
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
)
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    service: AuthService = Depends(_auth_service),
):
    """
    Called by Google after user consent.
    Exchanges the code for profile info, creates / updates the user,
    then redirects to the dashboard (or login on failure).
    """
    settings = get_settings()
    logger.info("GET /auth/google/callback")
    try:
        google_user = await exchange_google_code(code)
        result = await service.google_authenticate(google_user)
        tokens = result["tokens"]
        # Pass tokens as query params so the frontend can pick them up
        redirect_url = (
            f"{settings.REDIRECT_DASHBOARD_URL}"
            f"?access_token={tokens['access_token']}"
            f"&refresh_token={tokens['refresh_token']}"
        )
        logger.info("Google auth successful — redirecting to dashboard")
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Google auth failed — redirecting to login: %s", exc)
        return RedirectResponse(url=settings.REDIRECT_LOGIN_URL, status_code=status.HTTP_302_FOUND)


# =============================================================================
# Authenticated: current user profile
# =============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    logger.info("GET /auth/me — user %s", current_user["_id"])
    return UserResponse(**current_user)
