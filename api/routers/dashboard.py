from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict

from database import get_db, User, Scan, AttackEvent
from auth_utils import get_current_user

router = APIRouter()

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scans = db.query(Scan).filter(Scan.user_id == current_user.id).all()
    total_scans = len(scans)
    avg_score = sum(s.score for s in scans) / total_scans if scans else 100
    latest = max(scans, key=lambda s: s.created_at) if scans else None

    attacks = db.query(AttackEvent).filter(
        AttackEvent.user_id == current_user.id
    ).order_by(AttackEvent.created_at.desc()).limit(100).all()

    attack_counts = defaultdict(int)
    for a in attacks:
        prefix = a.rule_id.split("-")[0] if a.rule_id else "OTHER"
        attack_counts[prefix] += 1

    return {
        "user": {
            "name":       current_user.name,
            "plan":       current_user.plan,
            "scan_limit": current_user.scan_limit,
            "scans_used": total_scans,
        },
        "scans": {
            "total":        total_scans,
            "avg_score":    round(avg_score, 1),
            "latest_score": latest.score if latest else 100,
            "latest_grade": latest.grade if latest else "A+",
        },
        "attacks": {
            "total":   len(attacks),
            "blocked": sum(1 for a in attacks if a.action == "blocked"),
            "by_type": dict(attack_counts),
        },
        "recent_scans": [{
            "id":        s.id,
            "score":     s.score,
            "grade":     s.grade,
            "total":     s.total,
            "scan_type": s.scan_type,
            "created_at":s.created_at.isoformat(),
        } for s in sorted(scans, key=lambda x: x.created_at, reverse=True)[:5]],
    }


@router.get("/attacks")
def get_attacks(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attacks = db.query(AttackEvent)\
        .filter(AttackEvent.user_id == current_user.id)\
        .order_by(AttackEvent.created_at.desc())\
        .limit(limit).all()

    return {
        "attacks": [{
            "id":        a.id,
            "ip":        a.ip,
            "method":    a.method,
            "path":      a.path,
            "rule_id":   a.rule_id,
            "rule_name": a.rule_name,
            "severity":  a.severity,
            "action":    a.action,
            "country":   a.country,
            "city":      a.city,
            "flag":      a.flag,
            "time":      a.created_at.strftime("%H:%M:%S"),
        } for a in attacks]
    }


@router.post("/attack")
async def log_attack(request, db: Session = Depends(get_db)):
    from fastapi import Request
    try:
        data = await request.json()
    except Exception:
        return {"ok": False}

    api_key = request.headers.get("X-CyberSentry-Key", "")
    from database import APIKey
    key_record = db.query(APIKey).filter(
        APIKey.key == api_key, APIKey.is_active == True
    ).first()

    event = AttackEvent(
        user_id=key_record.user_id if key_record else None,
        ip=data.get("ip", "unknown"),
        method=data.get("method", "GET"),
        path=data.get("path", "/"),
        rule_id=data.get("rule_id", ""),
        rule_name=data.get("rule_name", ""),
        severity=data.get("severity", "medium"),
        action=data.get("action", "blocked"),
        country=data.get("country"),
        city=data.get("city"),
        flag=data.get("flag"),
    )
    db.add(event)
    db.commit()
    return {"ok": True}
