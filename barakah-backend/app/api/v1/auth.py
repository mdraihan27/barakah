"""
Authentication routes — all /api/v1/auth/* endpoints.
Thin controller layer: validates input, delegates to AuthService,
and shapes the response.
"""

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode, urlparse

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.core.logging import get_logger
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SendVerificationCodeRequest,
    SignupRequest,
    TokenResponse,
    UpdateRoleRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService
from app.services.google_service import exchange_google_code, get_google_auth_url
from app.utils.file_upload import save_image

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper to build service from DI ─────────────────────────────────────────

def _auth_service(db=Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


def _to_user_response(user: dict) -> UserResponse:
    """Map DB user doc to API user response with Google-avatar fallback."""
    user_doc = dict(user)
    user_doc["avatar_url"] = user_doc.get("avatar_url") or user_doc.get("google_avatar_url")
    return UserResponse(**user_doc)


def _is_localhost_url(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in {"localhost", "127.0.0.1"}


def _resolve_frontend_redirect_urls(settings, request: Request) -> tuple[str, str]:
    """
    Resolve dashboard/login redirect URLs for OAuth completion.

    In production, guard against accidentally using localhost defaults.
    """
    dashboard_url = settings.REDIRECT_DASHBOARD_URL
    login_url = settings.REDIRECT_LOGIN_URL

    if settings.APP_ENV == "development":
        return dashboard_url, login_url

    if not _is_localhost_url(dashboard_url) and not _is_localhost_url(login_url):
        return dashboard_url, login_url

    fallback_origin = None

    origin_header = request.headers.get("origin")
    if origin_header and not _is_localhost_url(origin_header):
        fallback_origin = origin_header.rstrip("/")

    if not fallback_origin:
        for cors_origin in settings.CORS_ORIGINS:
            if not _is_localhost_url(cors_origin):
                fallback_origin = cors_origin.rstrip("/")
                break

    if not fallback_origin:
        forwarded_host = request.headers.get("x-forwarded-host")
        if forwarded_host:
            proto = request.headers.get("x-forwarded-proto", "https")
            fallback_origin = f"{proto}://{forwarded_host}".rstrip("/")

    if not fallback_origin:
        return dashboard_url, login_url

    return f"{fallback_origin}/dashboard", f"{fallback_origin}/login"


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
        user=_to_user_response(result["user"]),
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
        user=_to_user_response(result["user"]),
        tokens=TokenResponse(**result["tokens"]),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh token pair",
)
async def refresh_tokens(
    body: RefreshTokenRequest,
    service: AuthService = Depends(_auth_service),
):
    """Exchange a valid refresh token for a new access+refresh token pair."""
    logger.info("POST /auth/refresh")
    tokens = await service.refresh_tokens(body.refresh_token)
    return TokenResponse(**tokens)


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
    request: Request,
    code: str = Query(..., description="Authorization code from Google"),
    service: AuthService = Depends(_auth_service),
):
    """
    Called by Google after user consent.
    Exchanges the code for profile info, creates / updates the user,
    then redirects to the dashboard (or login on failure).
    """
    settings = get_settings()
    dashboard_url, login_url = _resolve_frontend_redirect_urls(settings, request)
    logger.info("GET /auth/google/callback")
    try:
        google_user = await exchange_google_code(code)
        result = await service.google_authenticate(google_user)
        tokens = result["tokens"]
        is_new_user = bool(result.get("is_new_user"))
        # Pass tokens as query params so the frontend can pick them up.
        query = {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        }
        if is_new_user:
            query["is_new_user"] = "1"

        redirect_url = f"{dashboard_url}?{urlencode(query)}"
        logger.info("Google auth successful — redirecting to dashboard")
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Google auth failed — redirecting to login: %s", exc)
        return RedirectResponse(url=login_url, status_code=status.HTTP_302_FOUND)


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
    return _to_user_response(current_user)


@router.patch(
    "/me/avatar",
    response_model=UserResponse,
    summary="Update current user profile image",
)
async def update_my_avatar(
    request: Request,
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    """Upload and set a custom profile image for the authenticated user."""
    logger.info("PATCH /auth/me/avatar — user %s", current_user["_id"])
    relative_path = await save_image(image, "users")
    avatar_url = str(request.base_url).rstrip("/") + relative_path
    updated_user = await service.update_avatar(current_user["_id"], avatar_url)
    return _to_user_response(updated_user)


@router.patch(
    "/me/role",
    response_model=UserResponse,
    summary="Update current user role",
)
async def update_my_role(
    body: UpdateRoleRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    """Set role to consumer(user) or seller(shop_owner) during onboarding."""
    logger.info("PATCH /auth/me/role — user %s", current_user["_id"])
    updated_user = await service.update_role(current_user["_id"], body.role)
    return _to_user_response(updated_user)
