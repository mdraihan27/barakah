"""
Async email service using aiosmtplib.
Handles HTML email composition and dispatch for verification & reset flows.
"""

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# =============================================================================
# Low-level send helper
# =============================================================================

async def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an HTML email via SMTP. Returns True on success, False on failure.
    Failures are logged but never bubble up — callers decide how to handle.
    """
    settings = get_settings()

    message = MIMEMultipart("alternative")
    message["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent to %s — subject: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


# =============================================================================
# Public helpers — one per email type
# =============================================================================

async def send_verification_email(to_email: str, code: str, first_name: str) -> bool:
    """Send the 6-digit email verification code."""
    settings = get_settings()
    subject = f"{settings.APP_NAME} — Verify your email"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#333">Email Verification</h2>
        <p>Hi {first_name},</p>
        <p>Use the code below to verify your email address. It expires in
        {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutes.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;
                    text-align:center;padding:16px;background:#f5f5f5;
                    border-radius:8px;margin:24px 0">{code}</div>
        <p style="color:#777;font-size:13px">If you didn't create an account,
        you can safely ignore this email.</p>
    </div>
    """
    return await _send_email(to_email, subject, html)


async def send_password_reset_email(to_email: str, code: str, first_name: str) -> bool:
    """Send the 6-digit password-reset code."""
    settings = get_settings()
    subject = f"{settings.APP_NAME} — Reset your password"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#333">Password Reset</h2>
        <p>Hi {first_name},</p>
        <p>We received a request to reset your password. Use the code below —
        it expires in {settings.RESET_CODE_EXPIRE_MINUTES} minutes.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;
                    text-align:center;padding:16px;background:#f5f5f5;
                    border-radius:8px;margin:24px 0">{code}</div>
        <p style="color:#777;font-size:13px">If you didn't request this,
        you can safely ignore this email.</p>
    </div>
    """
    return await _send_email(to_email, subject, html)
