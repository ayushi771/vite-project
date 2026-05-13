from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta, timezone


def generate_otp_code(length: int = 6) -> str:
    return str(secrets.randbelow(10**length)).zfill(length)


def otp_expiry(minutes: int = 10) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)


def generate_token():
    return secrets.token_urlsafe(32)


def get_expiry():
    return datetime.now(timezone.utc) + timedelta(hours=1)


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)