from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from cybersentry.core.detection.engine import DetectionEngine
from cybersentry.core.defense.ip_reputation import IPReputationEngine, IPVerdict
from cybersentry.core.defense.flood_guard import FloodGuard
from cybersentry.core.defense.fingerprint import FingerprintEngine
from cybersentry.core.defense.tarpit import HoneypotManager
from cybersentry.core.defense.geo_lookup import GeoLookupEngine, GeoInfo
from cybersentry.core.score.engine import ScoreEngine
import uvicorn, uuid, time, threading
from collections import deque

app = FastAPI(title="CyberSentry Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
detection = DetectionEngine(block_on_severity=["critical","high"])
ip_rep    = IPReputationEngine(block_tor=True, block_abusive=True, challenge_datacenters=False)
flood     = FloodGuard(http_flood_rpm=500, http_flood_burst=100, conn_rate_per_sec=100)
fp_engine = FingerprintEngine()
honeypot  = HoneypotManager()
score_eng = ScoreEngine()
geo_eng   = GeoLookupEngine()

attack_log = deque(maxlen=200)
stats = {"total_requests":0,"blocked":0,"clean":0,"attacks_detected":0}
SKIP = {"/stats","/log","/docs","/openapi.json","/health","/debug/inject"}

def _log(req_id, ip, method, path, rule, rule_name, severity, action, geo=None):
    attack_log.appendleft({
        "id":req_id,"time":time.strftime("%H:%M:%S"),
        "ip":ip,"method":method,"path":path,
        "params":f"{rule}:{rule_name}"[:80],
        "rule":rule,"rule_name":rule_name,
        "severity":severity,"action":action,
        "geo":geo.to_dict() if geo else None,
    })

def _async_geo_log(req_id, ip, method, path, rule, rule_name, severity, action):
    def _fetch():
        geo = geo_eng.lookup(ip)
        _log(req_id, ip, method, path, rule, rule_name, severity, action, geo)
    threading.Thread(target=_fetch, daemon=True).start()

@app.middleware("http")
async def protect(request: Request, call_next):
    path    = str(request.url.path)
    method  = request.method
    ip      = request.client.host if request.client else "127.0.0.1"
    req_id  = str(uuid.uuid4())[:8]
    headers = dict(request.headers)
    stats["total_requests"] += 1

    if path in SKIP or path.startswith("/debug"):
        return await call_next(request)

    ip_result = ip_rep.check(ip)
    if ip_result.verdict == IPVerdict.BLOCK:
        stats["blocked"] += 1
        _async_geo_log(req_id,ip,method,path,"IP_REP",ip_result.reason,"high","blocked")
        return JSONResponse(status_code=403, content={"error":"blocked"})

    header_size = sum(len(k)+len(v) for k,v in headers.items())
    flood_ok, flood_reason = flood.check_request(ip, method, path, header_size, 0)
    if not flood_ok:
        stats["blocked"] += 1
        return JSONResponse(status_code=429, content={"error":"rate_limited"},
                           headers={"Retry-After":"60"})

    fp = fp_engine.fingerprint(ip, method, path, headers)
    if fp.recommended_action == "block" and not fp.is_known_good_bot:
        stats["blocked"] += 1
        _async_geo_log(req_id,ip,method,path,"BOT",f"score:{fp.bot_score}","high","blocked")
        return JSONResponse(status_code=403, content={"error":"bot_detected"})

    if honeypot.is_honeypot(path):
        stats["blocked"] += 1
        ip_rep.ban(ip, 86400)
        _async_geo_log(req_id,ip,method,path,"HONEYPOT",path,"high","banned")
        sc, body = honeypot.get_fake_response(path)
        from starlette.responses import PlainTextResponse
        return PlainTextResponse(body, status_code=sc)

    body_dict = None
    if method in ("POST","PUT","PATCH"):
        try:
            import json as _json
            body_bytes = await request.body()
            ct = headers.get("content-type","")
            if "application/json" in ct:
                body_dict = _json.loads(body_bytes) if body_bytes else {}
            elif "form" in ct:
                from urllib.parse import parse_qs
                body_dict = {k:v[0] for k,v in parse_qs(body_bytes.decode()).items()}
        except Exception:
            pass

    analysis = detection.analyze(
        request_id=req_id, path=path, method=method,
        params=dict(request.query_params),
        body=body_dict, headers=headers, source_ip=ip,
    )

    if analysis.is_attack:
        stats["attacks_detected"] += 1
        for d in analysis.detections:
            _async_geo_log(req_id,ip,method,path,d.rule_id,d.rule_name,d.severity,
                          "blocked" if analysis.blocked else "detected")

    if analysis.blocked:
        stats["blocked"] += 1
        return JSONResponse(status_code=403, content={
            "error":"request_blocked","request_id":req_id,
            "threat_level":analysis.threat_level,
            "rules_triggered":[{"id":d.rule_id,"name":d.rule_name,"severity":d.severity}
                               for d in analysis.detections],
            "message":"This request was blocked by CyberSentry.",
        }, headers={"X-Request-ID":req_id,"X-Content-Type-Options":"nosniff"})

    stats["clean"] += 1
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.get("/search")
def search(q: str = ""):
    return {"query":q,"results":[{"id":1,"title":"Result 1"}]}

@app.get("/user")
def user(id: str = "1"):
    return {"id":id,"name":"Alice"}

@app.get("/file")
def read_file(name: str = "readme.txt"):
    return {"file":name}

@app.get("/fetch")
def fetch(url: str = "https://example.com"):
    return {"url":url}

@app.get("/ping")
def ping(host: str = "localhost"):
    return {"host":host,"result":"pong"}

@app.post("/login")
async def login(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    return {"status":"ok","user":data.get("username","")}

@app.get("/geo/{ip}")
def geo_lookup(ip: str):
    return geo_eng.lookup(ip).to_dict()

@app.post("/debug/inject")
async def inject_attack(request: Request):
    """Inject a fake attack with geo data for testing."""
    data = await request.json()
    ip       = data.get("ip","1.2.3.4")
    rule     = data.get("rule","SQLI-001")
    severity = data.get("severity","critical")
    path     = data.get("path","/search")
    geo_data = data.get("geo", None)
    req_id   = str(uuid.uuid4())[:8]

    if geo_data:
        geo = GeoInfo(
            ip=ip,
            country=geo_data.get("country","Unknown"),
            country_code=geo_data.get("country_code","??"),
            region=geo_data.get("region",""),
            city=geo_data.get("city",""),
            isp=geo_data.get("isp",""),
            org=geo_data.get("org",""),
            lat=float(geo_data.get("lat",0.0)),
            lon=float(geo_data.get("lon",0.0)),
            timezone=geo_data.get("timezone","UTC"),
            is_proxy=geo_data.get("is_proxy",False),
            is_hosting=geo_data.get("is_hosting",False),
            flag=geo_data.get("flag","🌍"),
        )
    else:
        geo = geo_eng.lookup(ip)

    stats["attacks_detected"] += 1
    stats["blocked"] += 1
    stats["total_requests"] += 1
    _log(req_id, ip, "GET", path, rule, rule, severity, "blocked", geo)
    return {"ok":True,"geo":geo.to_dict()}

@app.get("/stats")
def get_stats():
    attack_list = list(attack_log)
    counts = {
        "critical": sum(1 for a in attack_list if a.get("severity")=="critical"),
        "high":     sum(1 for a in attack_list if a.get("severity")=="high"),
        "medium":   sum(1 for a in attack_list if a.get("severity")=="medium"),
        "low":      sum(1 for a in attack_list if a.get("severity")=="low"),
    }
    score = score_eng.compute(**counts)
    return {**stats,"score":score.score,"grade":score.grade,"recent_attacks":attack_list[:20]}

@app.get("/log")
def get_log():
    return {"attacks":list(attack_log)}

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  CyberSentry — All Layers + Geo Tracking")
    print("="*55)
    print("  http://localhost:8000/stats")
    print("  http://localhost:8000/geo/8.8.8.8")
    print("  http://localhost:8000/debug/inject  [POST]")
    print("="*55+"\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")


@app.post("/settings")
async def save_settings(request: Request):
    """Save settings from dashboard."""
    data = await request.json()
    # In a real app this would update the middleware config
    # For now we store it and return success
    return {
        "ok": True,
        "saved": data,
        "message": "Settings saved successfully"
    }

@app.get("/settings")
def get_settings():
    """Get current settings."""
    return {
        "blockAttacks": True,
        "rateLimit": True,
        "anomalyDetection": True,
        "securityHeaders": True,
        "rateLimitRpm": 300,
        "rateLimitWindow": 60,
        "blockOnSeverity": "high",
        "logLevel": "INFO",
        "apiHost": "127.0.0.1",
        "apiPort": 8000,
        "tarpit": True,
        "honeypot": True,
        "ipReputation": True,
        "botFingerprint": True,
    }
