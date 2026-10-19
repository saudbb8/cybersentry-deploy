"""
CyberSentry SaaS — Auth utilities
JWT tokens + password hashing
"""
import os
import hashlib
import hmac
import secrets
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session

from database import get_db, User

SECRET_KEY = os.environ.get("JWT_SECRET", "")
if not SECRET_KEY or SECRET_KEY == "cybersentry-jwt-secret-change-in-production":
    raise RuntimeError("Set a private JWT_SECRET before starting the API")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7   # 7 days


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{base64.b64encode(hashed).decode()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, stored_hash = hashed.split(':')
        computed = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(
            base64.b64encode(computed).decode(),
            stored_hash
        )
    except Exception:
        return False


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "exp":   datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
        "iat":   datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Dependencies ──────────────────────────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    user_id = payload.get("sub")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None


# ── API Key generation ────────────────────────────────────────────────────────

def generate_api_key() -> str:
    return f"cs_{secrets.token_urlsafe(32)}"
