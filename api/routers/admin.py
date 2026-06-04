"""
CyberSentry Admin Router
GET  /api/admin/stats        — overview stats
GET  /api/admin/users        — all users with activity
PUT  /api/admin/users/{id}   — update user (verify, ban, plan)
DELETE /api/admin/users/{id} — delete user
GET  /api/admin/scans        — all scans
GET  /api/admin/logs         — activity logs
POST /api/admin/login        — admin login
"""
import os
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from database import get_db, User, Scan
from auth_utils import verify_password, create_token, get_current_user

router = APIRouter()

ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL", "saudbb8@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@Cyber2026")

class AdminLoginRequest(BaseModel):
    email:    str
    password: str

class UpdateUserRequest(BaseModel):
    is_verified: Optional[bool] = None
    is_active:   Optional[bool] = None
    plan:        Optional[str]  = None
    is_admin:    Optional[bool] = None

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.email != ADMIN_EMAIL:
        raise HTTPException(403, "Admin access required")
    return current_user

@router.post("/login")
def admin_login(req: AdminLoginRequest, db: Session = Depends(get_db)):
    if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid admin credentials")
    
    # Get or create admin user
    user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not user:
        from auth_utils import hash_password
        user = User(
            name="Admin",
            email=ADMIN_EMAIL,
            password_hash=hash_password(req.password),
            plan="admin",
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_token(user.id, user.email)
    print(f"✅ Admin login: {user.email}")
    return {
        "token": token,
        "admin": {"id": user.id, "name": user.name, "email": user.email}
    }

@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), admin = Depends(require_admin)):
    users = db.query(User).all()
    scans = db.query(Scan).all() if hasattr(Scan, '__tablename__') else []
    
    total_users     = len(users)
    verified_users  = sum(1 for u in users if u.is_verified)
    active_users    = sum(1 for u in users if u.is_active)
    banned_users    = sum(1 for u in users if not u.is_active)
    free_users      = sum(1 for u in users if u.plan == "free")
    pro_users       = sum(1 for u in users if u.plan == "pro")
    team_users      = sum(1 for u in users if u.plan == "team")
    total_scans     = len(scans)
    
    # Revenue estimate
    revenue = (pro_users * 29) + (team_users * 99)
    
    # Recent signups (last 7 days)
    from datetime import timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent = sum(1 for u in users if u.created_at and 
                 u.created_at.replace(tzinfo=timezone.utc) > week_ago)
    
    return {
        "users": {
            "total":    total_users,
            "verified": verified_users,
            "active":   active_users,
            "banned":   banned_users,
            "recent":   recent,
        },
        "plans": {
            "free": free_users,
            "pro":  pro_users,
            "team": team_users,
        },
        "scans":   {"total": total_scans},
        "revenue": {"monthly": revenue, "currency": "USD"},
    }

@router.get("/users")
def admin_users(
    search: str = "",
    plan:   str = "",
    status: str = "",
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    query = db.query(User)
    users = query.order_by(User.created_at.desc()).all()
    
    result = []
    for u in users:
        # Filter
        if search and search.lower() not in u.email.lower() and search.lower() not in u.name.lower():
            continue
        if plan and u.plan != plan:
            continue
        if status == "verified" and not u.is_verified:
            continue
        if status == "unverified" and u.is_verified:
            continue
        if status == "banned" and u.is_active:
            continue
        
        scans = db.query(Scan).filter(Scan.user_id == u.id).all() if hasattr(Scan, 'user_id') else []
        
        result.append({
            "id":          u.id,
            "name":        u.name,
            "email":       u.email,
            "plan":        u.plan,
            "is_verified": u.is_verified,
            "is_active":   u.is_active,
            "created_at":  u.created_at.isoformat() if u.created_at else "",
            "last_login":  u.last_login.isoformat() if u.last_login else None,
            "scan_count":  len(scans),
        })
    
    return {"users": result, "total": len(result)}

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    req: UpdateUserRequest,
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    if req.is_verified is not None: user.is_verified = req.is_verified
    if req.is_active is not None:   user.is_active   = req.is_active
    if req.plan is not None:        user.plan        = req.plan
    
    db.commit()
    return {"message": "User updated", "user": {
        "id": user.id, "email": user.email,
        "plan": user.plan, "is_verified": user.is_verified,
        "is_active": user.is_active
    }}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.email == ADMIN_EMAIL:
        raise HTTPException(400, "Cannot delete admin account")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}

@router.get("/scans")
def admin_scans(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    try:
        scans = db.query(Scan).order_by(Scan.created_at.desc()).limit(100).all()
        result = []
        for s in scans:
            user = db.query(User).filter(User.id == s.user_id).first()
            result.append({
                "id":         s.id,
                "user_email": user.email if user else "unknown",
                "user_name":  user.name if user else "unknown",
                "score":      s.score,
                "grade":      s.grade,
                "total":      s.total,
                "critical":   s.critical,
                "scan_type":  s.scan_type,
                "created_at": s.created_at.isoformat() if s.created_at else "",
            })
        return {"scans": result, "total": len(result)}
    except:
        return {"scans": [], "total": 0}
