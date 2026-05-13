import aiosmtplib
import os
import logging
from email.message import EmailMessage

logger = logging.getLogger("uvicorn.error")

REQUIRED = [
    "GMAIL_FROM",
    "GMAIL_SMTP_SERVER",
    "GMAIL_SMTP_PORT",
    "GMAIL_SMTP_USERNAME",
    "GMAIL_SMTP_PASSWORD",
]

async def send_email(to_email: str, subject: str, body: str):
    missing = [k for k in REQUIRED if not os.getenv(k)]
    if missing:
        # ✅ IMPORTANT: raise so /forgot-password returns 500 instead of fake 200
        raise RuntimeError(f"Missing email env vars: {', '.join(missing)}")

    message = EmailMessage()
    message["From"] = os.getenv("GMAIL_FROM")
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=os.getenv("GMAIL_SMTP_SERVER"),
            port=int(os.getenv("GMAIL_SMTP_PORT")),
            username=os.getenv("GMAIL_SMTP_USERNAME"),
            password=os.getenv("GMAIL_SMTP_PASSWORD"),
            start_tls=True,
        )
        logger.info(f"✅ Email sent to {to_email}")
    except Exception as e:
        logger.exception(f"❌ Email sending failed: {e}")
        raise