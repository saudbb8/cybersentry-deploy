"""
CyberSentry SaaS — Scan Router
POST /api/scan/code    — scan pasted code
GET  /api/scan/history — user's scan history
GET  /api/scan/:id     — single scan result
DELETE /api/scan/:id   — delete scan
"""
import json
import time
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, User, Scan
from auth_utils import get_current_user

router = APIRouter()

# ── Detection patterns ────────────────────────────────────────────────────────
PATTERNS = [
    {"id":"SQLI-001","severity":"critical","title":"SQL injection via string concat",        "re":r'["\'`]?\s*\+\s*(username|user_input|query|input|id|name|email|search)',  "fix":"Use parameterized queries: db.execute('SELECT * WHERE id = ?', (id,))"},
    {"id":"SQLI-002","severity":"critical","title":"SQL UNION-based injection",              "re":r'(?i)UNION\s+SELECT',                                                     "fix":"Use parameterized queries. Never concatenate user input into SQL."},
    {"id":"SQLI-003","severity":"high",    "title":"SQL query via f-string",                "re":r'(?i)f["\'].*SELECT.*\{',                                                  "fix":"Use parameterized queries instead of f-strings."},
    {"id":"XSS-001", "severity":"high",    "title":"XSS via unescaped output",              "re":r'return\s+f["\'].*<.*\{(user_input|query|name|data|input|request)\}',     "fix":"HTML-encode output: html.escape(user_input)"},
    {"id":"XSS-002", "severity":"high",    "title":"Unsafe template rendering",             "re":r'render_template_string\s*\([^)]*\+',                                     "fix":"Never pass user input to render_template_string()."},
    {"id":"PATH-001","severity":"critical","title":"Path traversal via string concat",       "re":r'open\s*\(\s*["\'\`][^"\'\`]*["\'\`]\s*\+',                              "fix":"Use Path.resolve() and verify path stays in base dir."},
    {"id":"PATH-002","severity":"critical","title":"Unvalidated file path from user input",  "re":r'open\s*\(\s*(filename|filepath|file_path|name|path)\s*\)',               "fix":"Validate path: BASE=(Path('uploads').resolve()); assert path.is_relative_to(BASE)"},
    {"id":"CMDI-001","severity":"critical","title":"Command injection via os.system",        "re":r'os\.(system|popen)\s*\(.*\+',                                            "fix":"Use subprocess.run(['ping', host], capture_output=True) — list args only."},
    {"id":"CMDI-002","severity":"critical","title":"Command injection — shell=True",         "re":r'subprocess\.(call|run|Popen)\s*\(.*shell\s*=\s*True',                   "fix":"Remove shell=True and pass args as a list instead."},
    {"id":"SSRF-001","severity":"high",    "title":"Potential SSRF — unvalidated URL fetch", "re":r'requests\.(get|post)\s*\(.*\b(url|endpoint|target|link)\b',             "fix":"Validate URLs — block private IPs and metadata endpoints."},
    {"id":"SSTI-001","severity":"critical","title":"Server-side template injection",          "re":r'render_template_string\s*\(.*\{',                                       "fix":"Never render user-controlled data as a template."},
    {"id":"SEC-001", "severity":"critical","title":"Hardcoded password detected",             "re":r'(password|passwd|pwd)\s*=\s*["\'][^"\']{4,}["\']',                     "fix":"Use environment variables: os.environ.get('DB_PASSWORD')"},
    {"id":"SEC-002", "severity":"critical","title":"Hardcoded API key detected",              "re":r'(api_key|apikey|api_secret|token|secret_key)\s*=\s*["\'][^"\']{8,}["\']', "fix":"Use environment variables or a secrets manager."},
    {"id":"SEC-003", "severity":"high",    "title":"Hardcoded database URL",                  "re":r'(mysql|postgresql|mongodb|redis):\/\/[^"\'\s]{5,}',                    "fix":"Move database URLs to environment variables."},
    {"id":"SEC-004", "severity":"high",    "title":"AWS credentials detected",                "re":r'AKIA[0-9A-Z]{16}',                                                     "fix":"Revoke this key immediately. Use IAM roles instead."},
    {"id":"SEC-005", "severity":"medium",  "title":"Debug mode enabled",                      "re":r'DEBUG\s*=\s*True',                                                     "fix":"Set DEBUG=False in production."},
    {"id":"JWT-001", "severity":"critical","title":"JWT algorithm none attack vector",         "re":r'(?i)verify_signature.*False|algorithms.*none',                         "fix":"Always verify JWT signatures. Never accept alg:none."},
    {"id":"XXE-001", "severity":"critical","title":"XML external entity injection",            "re":r'(?i)<!DOCTYPE|<!ENTITY.*SYSTEM',                                       "fix":"Use defusedxml instead of standard xml library."},
    {"id":"NOSQL-001","severity":"critical","title":"NoSQL injection via operator",            "re":r'\[\$where\]|\[\$gt\]|\[\$ne\]|"\$where"\s*:',                          "fix":"Validate input types — reject objects where strings are expected."},
]

PLAN_LIMITS = {"free": 10, "pro": 999999, "team": 999999}


def run_scan(code: str, scan_type: str) -> dict:
    type_map = {
        "full":    ["sqli","xss","path","cmdi","ssrf","ssti","secrets","jwt","xxe","nosql"],
        "secrets": ["secrets"],
        "sast":    ["sqli","xss","path","cmdi","ssrf","ssti","jwt","xxe","nosql"],
        "deps":    ["deps"],
    }
    allowed = type_map.get(scan_type, type_map["full"])

    id_to_category = {
        "SQLI": "sqli", "XSS": "xss", "PATH": "path",
        "CMDI": "cmdi", "SSRF": "ssrf", "SSTI": "ssti",
        "SEC":  "secrets", "JWT": "jwt", "XXE": "xxe", "NOSQL": "nosql",
    }

    findings = []
    lines = code.split('\n')
    start = time.time()

    for p in PATTERNS:
        prefix = p["id"].split("-")[0]
        category = id_to_category.get(prefix, "")
        if category not in allowed:
            continue

        compiled = re.compile(p["re"], re.IGNORECASE)
        for i, line in enumerate(lines):
            trimmed = line.strip()
            if not trimmed or trimmed.startswith('#'):
                continue
            if compiled.search(line):
                if not any(f["rule_id"] == p["id"] and f["line_number"] == i+1 for f in findings):
                    findings.append({
                        "rule_id":      p["id"],
                        "severity":     p["severity"],
                        "title":        p["title"],
                        "file_path":    "uploaded_code.py",
                        "line_number":  i + 1,
                        "code_snippet": trimmed[:120],
                        "remediation":  p["fix"],
                    })

    findings.sort(key=lambda f: {"critical":0,"high":1,"medium":2,"low":3}.get(f["severity"], 4))

    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in ["critical","high","medium","low"]}
    score = max(0, 100 - counts["critical"]*25 - counts["high"]*15 - counts["medium"]*8 - counts["low"]*3)
    grade_map = [(90,"A+"),(80,"A"),(70,"B+"),(60,"B"),(50,"C"),(40,"D"),(0,"F")]
    grade = next(g for threshold, g in grade_map if score >= threshold)

    return {
        "findings":    findings,
        "score":       round(score, 1),
        "grade":       grade,
        "critical":    counts["critical"],
        "high":        counts["high"],
        "medium":      counts["medium"],
        "low":         counts["low"],
        "total":       len(findings),
        "code_lines":  len(lines),
        "duration_ms": int((time.time() - start) * 1000),
    }


class ScanRequest(BaseModel):
    code:      str
    scan_type: Optional[str] = "full"
    filename:  Optional[str] = "code.py"


@router.post("/code")
def scan_code(
    req: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check plan limits
    limit = PLAN_LIMITS.get(current_user.plan, 10)
    today_count = db.query(Scan).filter(
        Scan.user_id == current_user.id
    ).count()

    if current_user.plan == "free" and today_count >= limit:
        raise HTTPException(429, f"Free plan limit reached ({limit} scans). Upgrade to Pro for unlimited scans.")

    if not req.code.strip():
        raise HTTPException(400, "No code provided")

    if len(req.code) > 500000:
        raise HTTPException(400, "Code too large — max 500KB")

    # Run scan
    result = run_scan(req.code, req.scan_type or "full")

    # Save to database
    scan = Scan(
        user_id=current_user.id,
        scan_type=req.scan_type or "full",
        score=result["score"],
        grade=result["grade"],
        critical=result["critical"],
        high=result["high"],
        medium=result["medium"],
        low=result["low"],
        total=result["total"],
        findings=json.dumps(result["findings"]),
        code_lines=result["code_lines"],
        duration_ms=result["duration_ms"],
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return {
        "scan_id":   scan.id,
        "scan_type": req.scan_type,
        "score":     result["score"],
        "grade":     result["grade"],
        "critical":  result["critical"],
        "high":      result["high"],
        "medium":    result["medium"],
        "low":       result["low"],
        "total":     result["total"],
        "findings":  result["findings"],
        "code_lines":result["code_lines"],
        "duration_ms": result["duration_ms"],
        "created_at": scan.created_at.isoformat(),
        "scans_used": today_count + 1,
        "scans_limit": limit,
    }


@router.get("/history")
def scan_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scans = db.query(Scan)\
        .filter(Scan.user_id == current_user.id)\
        .order_by(Scan.created_at.desc())\
        .limit(limit)\
        .all()

    return {
        "scans": [{
            "id":         s.id,
            "scan_type":  s.scan_type,
            "score":      s.score,
            "grade":      s.grade,
            "critical":   s.critical,
            "high":       s.high,
            "medium":     s.medium,
            "low":        s.low,
            "total":      s.total,
            "code_lines": s.code_lines,
            "created_at": s.created_at.isoformat(),
        } for s in scans],
        "total": len(scans),
    }


@router.get("/{scan_id}")
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()

    if not scan:
        raise HTTPException(404, "Scan not found")

    return {
        "id":         scan.id,
        "scan_type":  scan.scan_type,
        "score":      scan.score,
        "grade":      scan.grade,
        "critical":   scan.critical,
        "high":       scan.high,
        "medium":     scan.medium,
        "low":        scan.low,
        "total":      scan.total,
        "findings":   json.loads(scan.findings),
        "code_lines": scan.code_lines,
        "duration_ms":scan.duration_ms,
        "created_at": scan.created_at.isoformat(),
    }


@router.delete("/{scan_id}")
def delete_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()

    if not scan:
        raise HTTPException(404, "Scan not found")

    db.delete(scan)
    db.commit()
    return {"message": "Scan deleted"}
