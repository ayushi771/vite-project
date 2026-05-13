import os
import logging
from email.message import EmailMessage

import aiosmtplib

logger = logging.getLogger("uvicorn.error")

REQUIRED = [
    "GMAIL_FROM",
    "GMAIL_SMTP_SERVER",
    "GMAIL_SMTP_PORT",
    "GMAIL_SMTP_USERNAME",
    "GMAIL_SMTP_PASSWORD",
]

async def send_email(to_email: str, subject: str, body: str):
    """
    EMAIL_MODE:
      - "console": do not send, only log (safe for Render testing)
      - "smtp": actually send using SMTP (local or a provider that allows SMTP)
    """
    mode = (os.getenv("EMAIL_MODE") or "smtp").lower()

    if mode == "console":
        logger.info("========== EMAIL SIMULATION ==========")
        logger.info(f"TO: {to_email}")
        logger.info(f"SUBJECT: {subject}")
        logger.info(f"BODY:\n{body}")
        logger.info("=====================================")
        return

    # default: SMTP mode
    missing = [k for k in REQUIRED if not os.getenv(k)]
    if missing:
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
            timeout=20,
        )
        logger.info(f"✅ Email sent to {to_email}")
    except Exception as e:
        logger.exception(f"❌ Email sending failed: {e}")
        raise