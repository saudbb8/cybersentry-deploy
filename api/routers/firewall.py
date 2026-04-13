"""
CyberSentry SaaS — Firewall Router
Full firewall: IP blocking, country blocking, rate limits, custom rules
"""
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Session, relationship

from database import get_db, Base, engine, User, utcnow
from auth_utils import get_current_user

router = APIRouter()

# ── Firewall DB Models ────────────────────────────────────────────────────────

class FirewallRule(Base):
    __tablename__ = "firewall_rules"
    id          = Column(String, primary_key=True, default=lambda: __import__('uuid').uuid4().__str__())
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    name        = Column(String, nullable=False)
    rule_type   = Column(String, nullable=False)  # ip|country|pattern|rate_limit|user_agent|method
    value       = Column(String, nullable=False)  # the IP, country code, pattern, etc
    action      = Column(String, default="block")  # block|allow|rate_limit|log
    is_active   = Column(Boolean, default=True)
    priority    = Column(Integer, default=100)
    hits        = Column(Integer, default=0)
    description = Column(String, default="")
    created_at  = Column(DateTime, default=utcnow)
    last_hit    = Column(DateTime, nullable=True)

class FirewallLog(Base):
    __tablename__ = "firewall_logs"
    id          = Column(String, primary_key=True, default=lambda: __import__('uuid').uuid4().__str__())
    user_id     = Column(String, ForeignKey("users.id"), nullable=True)
    rule_id     = Column(String, nullable=True)
    rule_name   = Column(String, nullable=True)
    ip          = Column(String)
    method      = Column(String)
    path        = Column(String)
    action      = Column(String)
    reason      = Column(String)
    country     = Column(String, nullable=True)
    flag        = Column(String, nullable=True)
    created_at  = Column(DateTime, default=utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# ── Pydantic models ───────────────────────────────────────────────────────────

class CreateRuleRequest(BaseModel):
    name:        str
    rule_type:   str
    value:       str
    action:      str = "block"
    priority:    int = 100
    description: str = ""

class UpdateRuleRequest(BaseModel):
    name:        Optional[str] = None
    is_active:   Optional[bool] = None
    action:      Optional[str] = None
    priority:    Optional[int] = None
    description: Optional[str] = None

class BlockIPRequest(BaseModel):
    ip:          str
    reason:      str = "Manually blocked"
    description: str = ""

class BlockCountryRequest(BaseModel):
    country_code: str
    country_name: str
    reason:       str = "Country blocked"

# ── Helper ────────────────────────────────────────────────────────────────────

def rule_to_dict(r: FirewallRule) -> dict:
    return {
        "id":          r.id,
        "name":        r.name,
        "rule_type":   r.rule_type,
        "value":       r.value,
        "action":      r.action,
        "is_active":   r.is_active,
        "priority":    r.priority,
        "hits":        r.hits,
        "description": r.description,
        "created_at":  r.created_at.isoformat(),
        "last_hit":    r.last_hit.isoformat() if r.last_hit else None,
    }

def log_to_dict(l: FirewallLog) -> dict:
    return {
        "id":        l.id,
        "rule_name": l.rule_name,
        "ip":        l.ip,
        "method":    l.method,
        "path":      l.path,
        "action":    l.action,
        "reason":    l.reason,
        "country":   l.country,
        "flag":      l.flag,
        "time":      l.created_at.strftime("%H:%M:%S"),
        "created_at":l.created_at.isoformat(),
    }

# ── Rules CRUD ────────────────────────────────────────────────────────────────

@router.get("/rules")
def get_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = db.query(FirewallRule).filter(
        FirewallRule.user_id == current_user.id
    ).order_by(FirewallRule.priority, FirewallRule.created_at).all()

    return {
        "rules": [rule_to_dict(r) for r in rules],
        "total": len(rules),
        "active": sum(1 for r in rules if r.is_active),
    }


@router.post("/rules")
def create_rule(
    req: CreateRuleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_types = ["ip", "country", "pattern", "rate_limit", "user_agent", "method", "cidr"]
    if req.rule_type not in valid_types:
        raise HTTPException(400, f"Invalid rule type. Must be one of: {valid_types}")

    valid_actions = ["block", "allow", "rate_limit", "log"]
    if req.action not in valid_actions:
        raise HTTPException(400, f"Invalid action. Must be one of: {valid_actions}")

    rule = FirewallRule(
        user_id=current_user.id,
        name=req.name.strip(),
        rule_type=req.rule_type,
        value=req.value.strip(),
        action=req.action,
        priority=req.priority,
        description=req.description,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return {"message": "Rule created", "rule": rule_to_dict(rule)}


@router.put("/rules/{rule_id}")
def update_rule(
    rule_id: str,
    req: UpdateRuleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(FirewallRule).filter(
        FirewallRule.id == rule_id,
        FirewallRule.user_id == current_user.id
    ).first()

    if not rule:
        raise HTTPException(404, "Rule not found")

    if req.name is not None:        rule.name = req.name
    if req.is_active is not None:   rule.is_active = req.is_active
    if req.action is not None:      rule.action = req.action
    if req.priority is not None:    rule.priority = req.priority
    if req.description is not None: rule.description = req.description

    db.commit()
    return {"message": "Rule updated", "rule": rule_to_dict(rule)}


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(FirewallRule).filter(
        FirewallRule.id == rule_id,
        FirewallRule.user_id == current_user.id
    ).first()

    if not rule:
        raise HTTPException(404, "Rule not found")

    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}


@router.post("/rules/{rule_id}/toggle")
def toggle_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(FirewallRule).filter(
        FirewallRule.id == rule_id,
        FirewallRule.user_id == current_user.id
    ).first()

    if not rule:
        raise HTTPException(404, "Rule not found")

    rule.is_active = not rule.is_active
    db.commit()
    return {"message": f"Rule {'enabled' if rule.is_active else 'disabled'}", "is_active": rule.is_active}


# ── Quick block IP ────────────────────────────────────────────────────────────

@router.post("/block-ip")
def block_ip(
    req: BlockIPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if already blocked
    existing = db.query(FirewallRule).filter(
        FirewallRule.user_id == current_user.id,
        FirewallRule.rule_type == "ip",
        FirewallRule.value == req.ip,
    ).first()

    if existing:
        existing.is_active = True
        db.commit()
        return {"message": f"IP {req.ip} is already blocked (re-enabled)", "rule": rule_to_dict(existing)}

    rule = FirewallRule(
        user_id=current_user.id,
        name=f"Block IP: {req.ip}",
        rule_type="ip",
        value=req.ip,
        action="block",
        priority=10,
        description=req.reason,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return {"message": f"IP {req.ip} blocked", "rule": rule_to_dict(rule)}


@router.post("/unblock-ip/{ip}")
def unblock_ip(
    ip: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = db.query(FirewallRule).filter(
        FirewallRule.user_id == current_user.id,
        FirewallRule.rule_type == "ip",
        FirewallRule.value == ip,
    ).all()

    for rule in rules:
        db.delete(rule)
    db.commit()

    return {"message": f"IP {ip} unblocked"}


# ── Country blocking ──────────────────────────────────────────────────────────

@router.post("/block-country")
def block_country(
    req: BlockCountryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(FirewallRule).filter(
        FirewallRule.user_id == current_user.id,
        FirewallRule.rule_type == "country",
        FirewallRule.value == req.country_code.upper(),
    ).first()

    if existing:
        existing.is_active = True
        db.commit()
        return {"message": f"{req.country_name} already blocked", "rule": rule_to_dict(existing)}

    rule = FirewallRule(
        user_id=current_user.id,
        name=f"Block country: {req.country_name}",
        rule_type="country",
        value=req.country_code.upper(),
        action="block",
        priority=20,
        description=req.reason,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return {"message": f"{req.country_name} blocked", "rule": rule_to_dict(rule)}


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/logs")
def get_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = db.query(FirewallLog).filter(
        FirewallLog.user_id == current_user.id
    ).order_by(FirewallLog.created_at.desc()).limit(limit).all()

    return {"logs": [log_to_dict(l) for l in logs], "total": len(logs)}


@router.post("/logs/clear")
def clear_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(FirewallLog).filter(FirewallLog.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Logs cleared"}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = db.query(FirewallRule).filter(FirewallRule.user_id == current_user.id).all()
    logs  = db.query(FirewallLog).filter(FirewallLog.user_id == current_user.id).all()

    total_hits   = sum(r.hits for r in rules)
    blocked_ips  = [r for r in rules if r.rule_type == "ip"      and r.is_active]
    blocked_cntrs= [r for r in rules if r.rule_type == "country"  and r.is_active]

    return {
        "total_rules":     len(rules),
        "active_rules":    sum(1 for r in rules if r.is_active),
        "blocked_ips":     len(blocked_ips),
        "blocked_countries": len(blocked_cntrs),
        "total_hits":      total_hits,
        "total_logs":      len(logs),
        "top_rules": sorted(
            [rule_to_dict(r) for r in rules if r.hits > 0],
            key=lambda x: x["hits"], reverse=True
        )[:5],
    }


# ── Export / Import ───────────────────────────────────────────────────────────

@router.get("/export")
def export_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = db.query(FirewallRule).filter(FirewallRule.user_id == current_user.id).all()
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "rules": [rule_to_dict(r) for r in rules],
    }


@router.post("/test-ip")
async def test_ip(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await request.json()
    ip   = data.get("ip", "")

    rules = db.query(FirewallRule).filter(
        FirewallRule.user_id == current_user.id,
        FirewallRule.is_active == True,
        FirewallRule.rule_type == "ip",
    ).all()

    for rule in rules:
        if rule.value == ip:
            return {"ip": ip, "action": rule.action, "rule": rule.name, "blocked": True}

    return {"ip": ip, "action": "allow", "rule": None, "blocked": False}
