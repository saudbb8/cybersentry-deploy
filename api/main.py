"""
CyberSentry SaaS — Main API
Full platform: auth + scan + dashboard + reports
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from database import init_db
from routers import auth, scan, dashboard, users, otp, firewall

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ CyberSentry SaaS started")
    yield

app = FastAPI(
    title="CyberSentry SaaS API",
    description="Developer-first security platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])
app.include_router(scan.router,      prefix="/api/scan",      tags=["Scan"])
app.include_router(firewall.router, prefix="/api/firewall", tags=["Firewall"])
app.include_router(otp.router,      prefix="/api/otp",       tags=["OTP"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {
        "name": "CyberSentry SaaS",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "ok", "time": time.time()}

@app.get("/api/settings")
def get_settings_public():
    return {"blockAttacks": True, "rateLimit": True, "tarpit": True, "honeypot": True, "ipReputation": True, "botFingerprint": True, "anomalyDetection": True, "securityHeaders": True, "rateLimitRpm": 300, "rateLimitWindow": 60, "blockOnSeverity": "high", "logLevel": "INFO", "apiHost": "127.0.0.1", "apiPort": 8000}

@app.post("/api/settings")
async def save_settings_public():
    return {"ok": True, "message": "Settings saved"}
