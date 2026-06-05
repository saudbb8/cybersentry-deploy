from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database import get_db, User, UserToken
from auth_utils import hash_password, verify_password, create_token, get_current_user
from email_service import generate_token, hash_token, send_verification_email, send_password_reset_email, send_welcome_email

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class ResendRequest(BaseModel):
    email: str

def user_response(user, token=None):
    d = {
        "id": user.id, "name": user.name, "email": user.email,
        "plan": user.plan, "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(), "scan_limit": user.scan_limit,
    }
    if token: d["token"] = token
    return d

def make_token(db, user_id, token_type, hours):
    old = db.query(UserToken).filter(
        UserToken.user_id==user_id,
        UserToken.token_type==token_type,
        UserToken.used==False
    ).all()
    for t in old: t.used = True
    raw = generate_token()
    db.add(UserToken(
        user_id=user_id, token_hash=hash_token(raw),
        token_type=token_type,
        expires_at=datetime.now(timezone.utc)+timedelta(hours=hours)
    ))
    db.commit()
    return raw

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not req.name or len(req.name.strip()) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")
    if not req.email or "@" not in req.email:
        raise HTTPException(400, "Please enter a valid email address")
    if not req.password or len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    email = req.email.lower().strip()
    if db.query(User).filter(User.email==email).first():
        raise HTTPException(400, "This email is already registered. Please sign in instead.")
    user = User(name=req.name.strip(), email=email,
                password_hash=hash_password(req.password), plan="free", is_verified=False)
    db.add(user); db.commit(); db.refresh(user)
    token = make_token(db, user.id, "verify_email", 24)
    import threading
    threading.Thread(target=send_verification_email, args=(user.email, user.name, token), daemon=True).start()
    print(f"✅ Registered: {user.email}")
    return {"message": "Account created! Check your email to verify.", "user": user_response(user), "needs_verification": True}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user  = db.query(User).filter(User.email==email).first()
    if not user:
        raise HTTPException(401, "No account found with this email.")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Incorrect password. Please try again.")
    if not user.is_active:
        raise HTTPException(401, "Account disabled. Contact support.")
    # Block unverified users
    if not user.is_verified:
        raise HTTPException(403, "EMAIL_NOT_VERIFIED")
    user.last_login = datetime.now(timezone.utc); db.commit()
    auth_token = create_token(user.id, user.email)
    print(f"✅ Login: {user.email}")
    return {"message": "Welcome back!", "user": user_response(user, auth_token)}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return user_response(current_user)

@router.post("/verify-email")
def verify_email(req: TokenRequest, db: Session = Depends(get_db)):
    record = db.query(UserToken).filter(
        UserToken.token_hash==hash_token(req.token),
        UserToken.token_type=="verify_email"
    ).first()
    if not record: raise HTTPException(400, "Invalid verification link.")
    if record.is_expired: raise HTTPException(400, "Link expired. Request a new one.")
    if record.used: raise HTTPException(400, "Link already used.")
    record.used = True
    user = db.query(User).filter(User.id==record.user_id).first()
    user.is_verified = True; db.commit()
    send_welcome_email(user.email, user.name)
    auth_token = create_token(user.id, user.email)
    print(f"✅ Verified: {user.email}")
    return {"message": "Email verified! Welcome to CyberSentry 🎉", "user": user_response(user, auth_token)}

@router.post("/resend-verification")
def resend(req: ResendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email==req.email.lower().strip()).first()
    if user and not user.is_verified:
        token = make_token(db, user.id, "verify_email", 24)
        import threading
    threading.Thread(target=send_verification_email, args=(user.email, user.name, token), daemon=True).start()
        print(f"📧 Resent verification: {user.email}")
    return {"message": "If registered and unverified, a new link has been sent."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email==req.email.lower().strip()).first()
    if user and user.is_active:
        token = make_token(db, user.id, "reset_password", 1)
        import threading
    threading.Thread(target=send_password_reset_email, args=(user.email, user.name, token), daemon=True).start()
        print(f"📧 Reset sent: {user.email}")
    return {"message": "If registered, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not req.password or len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    record = db.query(UserToken).filter(
        UserToken.token_hash==hash_token(req.token),
        UserToken.token_type=="reset_password"
    ).first()
    if not record: raise HTTPException(400, "Invalid reset link.")
    if record.is_expired: raise HTTPException(400, "Link expired (1 hour). Request a new one.")
    if record.used: raise HTTPException(400, "Link already used.")
    record.used = True
    user = db.query(User).filter(User.id==record.user_id).first()
    user.password_hash = hash_password(req.password); db.commit()
    auth_token = create_token(user.id, user.email)
    print(f"✅ Password reset: {user.email}")
    return {"message": "Password reset successfully!", "user": user_response(user, auth_token)}

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
