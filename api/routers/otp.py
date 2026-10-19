"""
CyberSentry — OTP Recovery
POST /api/otp/send    — send OTP via email or SMS
POST /api/otp/verify  — verify OTP and get reset token
"""
import secrets
import hmac
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database import get_db, User, UserToken

from email_service import send_otp_email

router = APIRouter()

# Store OTPs in memory (in production use Redis)
_otp_store = {}  # {email: {otp, expires_at, method}}


def generate_otp() -> str:
    return f'{secrets.randbelow(1_000_000):06d}'


class SendOTPRequest(BaseModel):
    email:  str
    method: str = "email"  # "email" or "sms"
    phone:  str = ""


class VerifyOTPRequest(BaseModel):
    email: str
    otp:   str


@router.post("/send")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    if req.method != "email":
        raise HTTPException(400, "Only email recovery is currently supported.")
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    message = "If this email is registered, an OTP has been sent."
    if not user or not user.is_active:
        return {"message": message, "method": "email"}
    otp = generate_otp()
    if not send_otp_email(email, user.name, otp):
        raise HTTPException(503, "Recovery email could not be sent. Please try again shortly.")
    _otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "method": "email",
        "user_id": user.id,
        "attempts": 0,
    }
    return {"message": message, "method": "email"}


@router.post("/verify")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    entry = _otp_store.get(email)

    if not entry:
        raise HTTPException(400, "No OTP found for this email. Please request a new one.")

    # Check attempts
    entry["attempts"] += 1
    if entry["attempts"] > 5:
        del _otp_store[email]
        raise HTTPException(400, "Too many attempts. Please request a new OTP.")

    # Check expiry
    if datetime.now(timezone.utc) > entry["expires_at"]:
        del _otp_store[email]
        raise HTTPException(400, "OTP has expired. Please request a new one.")

    # Check OTP
    if not hmac.compare_digest(req.otp.strip(), entry["otp"]):
        remaining = 5 - entry["attempts"]
        raise HTTPException(400, f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

    # OTP correct — generate reset token
    del _otp_store[email]
    user = db.query(User).filter(User.id == entry["user_id"]).first()

    if not user:
        raise HTTPException(400, "User not found.")

    # Create password reset token
    from routers.auth import make_token
    raw_token = make_token(db, user.id, "reset_password", hours=1)

    return {
        "message":     "OTP verified successfully!",
        "reset_token": raw_token,
        "user_name":   user.name,
    }
