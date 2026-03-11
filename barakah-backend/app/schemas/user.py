"""
Pydantic schemas for user-related request / response payloads.
Keeps API contracts separate from database models.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# Request Schemas
# =============================================================================

class SignupRequest(BaseModel):
    """Payload for user registration."""
    first_name: str = Field(..., min_length=1, max_length=50, examples=["John"])
    last_name: str = Field(..., min_length=1, max_length=50, examples=["Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["Str0ng!Pass"])
    is_shop_owner: bool = Field(False, description="Set to true to register as a shop owner")


class LoginRequest(BaseModel):
    """Payload for email + password login."""
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., examples=["Str0ng!Pass"])


class RefreshTokenRequest(BaseModel):
    """Payload to exchange refresh token for a new token pair."""
    refresh_token: str


class SendVerificationCodeRequest(BaseModel):
    """Request to send / resend the email verification code."""
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    """Payload to verify an email with the received code."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class ForgotPasswordRequest(BaseModel):
    """Request to send a password-reset code to email."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload to reset the password with the received code."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    new_password: str = Field(..., min_length=8, max_length=128, examples=["NewStr0ng!Pass"])


class UpdateRoleRequest(BaseModel):
    """Payload to update user role after OAuth onboarding."""
    role: str = Field(..., pattern="^(user|shop_owner)$", examples=["user", "shop_owner"])


class UpdateInterestRadiusRequest(BaseModel):
    """Payload to update the user's interest radius."""
    radius_km: float = Field(..., gt=0, le=100, examples=[10.0])


# =============================================================================
# Response Schemas
# =============================================================================

class UserResponse(BaseModel):
    """Public-facing user representation (no sensitive fields)."""
    id: str = Field(..., alias="_id")
    first_name: str
    last_name: str
    email: str
    is_email_verified: bool = False
    is_active: bool = True
    auth_provider: str = "local"
    role: str = "user"
    avatar_url: Optional[str] = None
    interest_radius_km: float = 10.0
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class TokenResponse(BaseModel):
    """JWT token pair returned on login / signup."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Combined auth response — user profile + tokens."""
    user: UserResponse
    tokens: TokenResponse


class MessageResponse(BaseModel):
    """Generic success message."""
    message: str
