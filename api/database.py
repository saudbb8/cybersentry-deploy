from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone, timedelta
import uuid, os

DB_PATH      = os.path.expanduser("~/Documents/cybersentry-saas/cybersentry_saas.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email         = Column(String, unique=True, index=True, nullable=False)
    name          = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    plan          = Column(String, default="free")
    is_active     = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=utcnow)
    last_login    = Column(DateTime, nullable=True)
    scans         = relationship("Scan", back_populates="user", cascade="all, delete")
    api_keys      = relationship("APIKey", back_populates="user", cascade="all, delete")
    tokens        = relationship("UserToken", back_populates="user", cascade="all, delete")

    @property
    def scan_limit(self):
        return {"free":10,"pro":999999,"team":999999}.get(self.plan, 10)

class UserToken(Base):
    __tablename__ = "user_tokens"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    token_type = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    user       = relationship("User", back_populates="tokens")

    @property
    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at.replace(tzinfo=timezone.utc)

    @property
    def is_valid(self):
        return not self.used and not self.is_expired

class Scan(Base):
    __tablename__ = "scans"
    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    scan_type   = Column(String, default="full")
    score       = Column(Float, default=100.0)
    grade       = Column(String, default="A+")
    critical    = Column(Integer, default=0)
    high        = Column(Integer, default=0)
    medium      = Column(Integer, default=0)
    low         = Column(Integer, default=0)
    total       = Column(Integer, default=0)
    findings    = Column(Text, default="[]")
    code_lines  = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    created_at  = Column(DateTime, default=utcnow)
    user        = relationship("User", back_populates="scans")

class APIKey(Base):
    __tablename__ = "api_keys"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    key        = Column(String, unique=True, index=True)
    name       = Column(String, default="Default")
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    last_used  = Column(DateTime, nullable=True)
    user       = relationship("User", back_populates="api_keys")

class AttackEvent(Base):
    __tablename__ = "attack_events"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=True)
    ip         = Column(String)
    method     = Column(String)
    path       = Column(String)
    rule_id    = Column(String)
    rule_name  = Column(String)
    severity   = Column(String)
    action     = Column(String)
    country    = Column(String, nullable=True)
    city       = Column(String, nullable=True)
    flag       = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database ready: {DB_PATH}")

def list_users():
    db = SessionLocal()
    users = db.query(User).all()
    db.close()
    return [{"id":u.id,"name":u.name,"email":u.email,"plan":u.plan,"is_verified":getattr(u,'is_verified',False),"created_at":str(u.created_at)} for u in users]
