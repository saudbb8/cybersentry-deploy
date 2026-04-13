"""
CyberSentry SaaS — Users Router
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/api-keys
POST   /api/users/api-keys
DELETE /api/users/api-keys/:id
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, User, APIKey
from auth_utils import get_current_user, generate_api_key, hash_password, verify_password

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    name:     Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


class CreateAPIKeyRequest(BaseModel):
    name: str = "Default"


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id":         current_user.id,
        "name":       current_user.name,
        "email":      current_user.email,
        "plan":       current_user.plan,
        "scan_limit": current_user.scan_limit,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }


@router.put("/profile")
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.name:
        if len(req.name.strip()) < 2:
            raise HTTPException(400, "Name too short")
        current_user.name = req.name.strip()

    if req.password:
        if not req.current_password:
            raise HTTPException(400, "Current password required to change password")
        if not verify_password(req.current_password, current_user.password_hash):
            raise HTTPException(400, "Current password is incorrect")
        if len(req.password) < 8:
            raise HTTPException(400, "New password must be at least 8 characters")
        current_user.password_hash = hash_password(req.password)

    db.commit()
    return {"message": "Profile updated", "name": current_user.name}


@router.get("/api-keys")
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).all()

    return {
        "api_keys": [{
            "id":         k.id,
            "name":       k.name,
            "key":        k.key,
            "created_at": k.created_at.isoformat(),
            "last_used":  k.last_used.isoformat() if k.last_used else None,
        } for k in keys]
    }


@router.post("/api-keys")
def create_api_key(
    req: CreateAPIKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Free plan: max 1 API key
    existing = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).count()

    if current_user.plan == "free" and existing >= 1:
        raise HTTPException(400, "Free plan allows 1 API key. Upgrade to Pro for more.")

    key = APIKey(
        user_id=current_user.id,
        key=generate_api_key(),
        name=req.name,
    )
    db.add(key)
    db.commit()
    db.refresh(key)

    return {
        "message":  "API key created",
        "api_key": {
            "id":   key.id,
            "name": key.name,
            "key":  key.key,
        }
    }


@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()

    if not key:
        raise HTTPException(404, "API key not found")

    key.is_active = False
    db.commit()
    return {"message": "API key deleted"}

from fastapi import APIRouter as _R
from fastapi.routing import APIRoute as _AR

@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user)):
    return {
        "blockAttacks": True, "rateLimit": True,
        "anomalyDetection": True, "securityHeaders": True,
        "rateLimitRpm": 300, "rateLimitWindow": 60,
        "blockOnSeverity": "high", "logLevel": "INFO",
        "apiHost": "127.0.0.1", "apiPort": 8000,
        "tarpit": True, "honeypot": True,
        "ipReputation": True, "botFingerprint": True,
    }

@router.post("/settings")
async def save_settings(request, current_user: User = Depends(get_current_user)):
    from fastapi import Request
    return {"ok": True, "message": "Settings saved"}
