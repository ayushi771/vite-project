import aiosmtplib
import os
import logging
from email.message import EmailMessage

logger = logging.getLogger("uvicorn.error")

REQUIRED_EMAIL_VARS = [
    "GMAIL_FROM",
    "GMAIL_SMTP_SERVER",
    "GMAIL_SMTP_PORT",
    "GMAIL_SMTP_USERNAME",
    "GMAIL_SMTP_PASSWORD",
]

def _missing_email_vars():
    return [k for k in REQUIRED_EMAIL_VARS if not os.getenv(k)]

async def send_email(to_email: str, subject: str, body: str):
    missing = _missing_email_vars()
    if missing:
        msg = f"Email config missing env vars: {', '.join(missing)}"
        logger.error(f"❌ {msg}")
        raise RuntimeError(msg)

    message = EmailMessage()
    message["From"] = os.getenv("GMAIL_FROM")
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=os.getenv("GMAIL_SMTP_SERVER"),
            port=int(os.getenv("GMAIL_SMTP_PORT", "587")),
            username=os.getenv("GMAIL_SMTP_USERNAME"),
            password=os.getenv("GMAIL_SMTP_PASSWORD"),
            start_tls=True,
        )
        logger.info(f"✅ Email sent to {to_email}")
    except Exception as e:
        logger.exception(f"❌ Email sending failed to {to_email}: {e}")
        raise