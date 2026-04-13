"""
CyberSentry — OTP Recovery
POST /api/otp/send    — send OTP via email or SMS
POST /api/otp/verify  — verify OTP and get reset token
"""
import random
import string
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database import get_db, User, UserToken

from email_service import generate_token, hash_token, send_email, APP_URL

router = APIRouter()

# Store OTPs in memory (in production use Redis)
_otp_store = {}  # {email: {otp, expires_at, method}}


def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


class SendOTPRequest(BaseModel):
    email:  str
    method: str = "email"  # "email" or "sms"
    phone:  str = ""


class VerifyOTPRequest(BaseModel):
    email: str
    otp:   str


@router.post("/send")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user  = db.query(User).filter(User.email == email).first()

    # Always return success to prevent enumeration
    if not user or not user.is_active:
        return {"message": "If this email is registered, an OTP has been sent."}

    otp        = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OTP
    _otp_store[email] = {
        "otp":        otp,
        "expires_at": expires_at,
        "method":     req.method,
        "user_id":    user.id,
        "attempts":   0,
    }

    if req.method == "email":
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:480px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:32px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">&#128272;</div>
    <h1 style="color:#38bdf8;margin:0;font-size:22px;font-weight:800">CyberSentry</h1>
  </div>
  <div style="padding:40px;text-align:center">
    <h2 style="color:#0f172a;margin:0 0 8px">Your verification code</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px">Hi {user.name}, use this code to recover your account</p>
    <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="font-size:48px;font-weight:900;letter-spacing:12px;color:#0f172a;margin:0;font-family:monospace">{otp}</p>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0">This code expires in <strong>10 minutes</strong>.<br>If you didn't request this, ignore this email.</p>
  </div>
</div></body></html>"""
        text = f"Hi {user.name},\n\nYour CyberSentry recovery code is: {otp}\n\nExpires in 10 minutes."
        send_email(email, "Your CyberSentry recovery code", html, text)
        print(f"📧 OTP sent to {email}: {otp}")

    return {"message": "If this email is registered, an OTP has been sent.", "method": req.method}


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
    if req.otp.strip() != entry["otp"]:
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

    print(f"✅ OTP verified for {email}")
    return {
        "message":     "OTP verified successfully!",
        "reset_token": raw_token,
        "user_name":   user.name,
    }
