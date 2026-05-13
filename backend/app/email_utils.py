import aiosmtplib
import os
from email.message import EmailMessage

async def send_email(to_email: str, subject: str, body: str):
    try:
        message = EmailMessage()
        message["From"] = os.getenv("GMAIL_FROM")
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message,
            hostname=os.getenv("GMAIL_SMTP_SERVER"),
            port=int(os.getenv("GMAIL_SMTP_PORT")),
            username=os.getenv("GMAIL_SMTP_USERNAME"),
            password=os.getenv("GMAIL_SMTP_PASSWORD"),
            start_tls=True,
        )

        print(f"✅ Email sent to {to_email}")

    except Exception as e:
        # IMPORTANT: do NOT crash your app
        print("❌ Email sending failed:", str(e))
        return