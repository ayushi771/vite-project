import os
import logging
import httpx

logger = logging.getLogger("uvicorn.error")


async def send_email(to_email: str, subject: str, body: str):
    """
    EMAIL_MODE:
      - "console": log email to server logs (dev/testing)
      - "resend": send email via Resend (recommended for Render)
    Env required for resend:
      - RESEND_API_KEY
      - EMAIL_FROM  (use onboarding@resend.dev for testing, or your verified sender)
    """
    mode = (os.getenv("EMAIL_MODE") or "resend").lower()

    if mode == "console":
        logger.info("========== EMAIL SIMULATION ==========")
        logger.info(f"TO: {to_email}")
        logger.info(f"SUBJECT: {subject}")
        logger.info(f"BODY:\n{body}")
        logger.info("=====================================")
        return

    if mode != "resend":
        raise RuntimeError(f"Unsupported EMAIL_MODE: {mode}")

    api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM")

    if not api_key:
        raise RuntimeError("Missing env var: RESEND_API_KEY")
    if not email_from:
        raise RuntimeError("Missing env var: EMAIL_FROM")

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers)

    # If Resend rejects (from not verified, etc), show the exact reason in Render logs
    if resp.status_code >= 400:
        logger.error(f"❌ Resend failed: {resp.status_code} {resp.text}")
        raise RuntimeError("Resend email sending failed")

    logger.info(f"✅ Resend email sent to {to_email}")