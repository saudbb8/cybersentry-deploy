import os
import smtplib
import secrets
import hashlib
import urllib.request
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Config
RESEND_KEY     = os.environ.get("RESEND_API_KEY", "")
GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = ''.join(c for c in os.environ.get("GMAIL_APP_PASSWORD", "") if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER or "onboarding@resend.dev")
APP_URL        = os.environ.get("APP_URL", "http://localhost:3003")

print(f"EMAIL CONFIG: resend={'SET' if RESEND_KEY else 'NOT SET'} gmail={'SET' if GMAIL_USER else 'NOT SET'} pwd_len={len(GMAIL_PASSWORD)}")

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    print(f"SENDING EMAIL to={to} subject={subject[:30]}")
    
    # Try Resend first (HTTP API - works on Railway)
    if RESEND_KEY:
        try:
            data = json.dumps({
                "from": "CyberSentry <onboarding@resend.dev>",
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            }).encode()
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=data,
                headers={
                    "Authorization": f"Bearer {RESEND_KEY}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                result = r.read()
                print(f"✅ Resend sent to {to} - status {r.status}")
                return True
        except Exception as e:
            print(f"❌ Resend failed: {e}")

    # Try Gmail SMTP
    if GMAIL_USER and len(GMAIL_PASSWORD) >= 16:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"CyberSentry <{FROM_EMAIL}>"
            msg["To"] = to
            msg.attach(MIMEText(text, "plain", "utf-8"))
            msg.attach(MIMEText(html, "html", "utf-8"))
            with smtplib.SMTP("smtp.gmail.com", 587) as s:
                s.ehlo()
                s.starttls()
                s.login(GMAIL_USER, GMAIL_PASSWORD)
                s.sendmail(FROM_EMAIL, to, msg.as_string())
            print(f"✅ Gmail sent to {to}")
            return True
        except Exception as e:
            print(f"❌ Gmail failed: {e}")

    # Terminal fallback
    print(f"\n{'='*60}")
    print(f"📧 EMAIL FALLBACK — {subject}")
    print(f"TO: {to}")
    print(f"{'-'*60}")
    print(text)
    print(f"{'='*60}\n")
    return True

def send_verification_email(to, name, token):
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center">
<h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Verify your email, {name}!</h2>
<p style="color:#475569">Click below to activate your account.</p>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Verify my email</a>
</div>
<p style="color:#94a3b8;font-size:12px">Expires in 24 hours.<br>Link: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nVerify your CyberSentry email:\n{link}\n\nExpires in 24 hours."
    return send_email(to, "Verify your CyberSentry account", html, text)

def send_password_reset_email(to, name, token):
    link = f"{APP_URL}/reset-password?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center">
<h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Reset your password</h2>
<p style="color:#475569">Hi {name}, click below to reset your password.</p>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Reset my password</a>
</div>
<p style="color:#94a3b8;font-size:12px">Expires in 1 hour.<br>Link: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nReset your CyberSentry password:\n{link}\n\nExpires in 1 hour."
    return send_email(to, "Reset your CyberSentry password", html, text)

def send_otp_email(to, name, otp):
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center">
<h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px;text-align:center">
<h2 style="color:#0f172a">Your recovery code</h2>
<p style="color:#64748b">Hi {name}, here is your 6-digit code:</p>
<div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:20px 0">
<p style="font-size:48px;font-weight:900;letter-spacing:12px;color:#0f172a;margin:0;font-family:monospace">{otp}</p>
</div>
<p style="color:#94a3b8;font-size:12px">Expires in 10 minutes.</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nYour CyberSentry code: {otp}\n\nExpires in 10 minutes."
    return send_email(to, "Your CyberSentry recovery code", html, text)

def send_welcome_email(to, name):
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center">
<h1 style="color:#38bdf8;margin:0">Welcome to CyberSentry!</h1></div>
<div style="padding:32px;text-align:center">
<h2 style="color:#0f172a">Hi {name}, you are all set!</h2>
<p style="color:#475569">Your account is verified and ready to use.</p>
<a href="{APP_URL}/app" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Go to dashboard</a>
</div></div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Go to {APP_URL}/app"
    return send_email(to, f"Welcome to CyberSentry!", html, text)
