import os, smtplib, secrets, hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_MODE     = os.environ.get("EMAIL_MODE", "terminal")
GMAIL_USER     = os.environ.get("GMAIL_USER", "")
# Strip ALL non-ASCII characters from password automatically
_raw_pwd       = os.environ.get("GMAIL_APP_PASSWORD", "")
GMAIL_PASSWORD = ''.join(c for c in _raw_pwd if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER)
APP_URL        = os.environ.get("APP_URL", "http://localhost:3003")

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    if EMAIL_MODE == "gmail" and GMAIL_USER and GMAIL_PASSWORD:
        return _gmail(to, subject, html, text)
    return _terminal(to, subject, html, text)

def _terminal(to, subject, html, text):
    print("\n" + "="*60)
    print(f"📧 EMAIL — {subject}")
    print(f"TO: {to}")
    print("-"*60)
    print(text)
    print("="*60 + "\n")
    return True

def _gmail(to, subject, html, text):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"CyberSentry <{FROM_EMAIL}>"
        msg["To"]      = to
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html",  "utf-8"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL_USER, GMAIL_PASSWORD)
            s.sendmail(FROM_EMAIL, to, msg.as_string())
        print(f"✅ Email sent → {to}")
        return True
    except smtplib.SMTPAuthenticationError:
        print(f"❌ Gmail auth failed — check App Password")
        return _terminal(to, subject, html, text)
    except Exception as e:
        print(f"❌ Gmail error: {e}")
        return _terminal(to, subject, html, text)

def send_verification_email(to, name, token):
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">&#128737;</div>
    <h1 style="color:#38bdf8;margin:0;font-size:24px;font-weight:800">CyberSentry</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a;margin:0 0 16px">Verify your email, {name}!</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px">Click the button below to verify your email and activate your account.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{link}" style="display:inline-block;background:#38bdf8;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px">Verify my email</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center">Expires in 24 hours. If you didn't register, ignore this.</p>
    <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b;word-break:break-all">{link}</div>
  </div>
</div></body></html>"""
    text = f"Hi {name},\n\nVerify your CyberSentry email:\n{link}\n\nExpires in 24 hours."
    return send_email(to, "Verify your CyberSentry account", html, text)

def send_password_reset_email(to, name, token):
    link = f"{APP_URL}/reset-password?token={token}"
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">&#128272;</div>
    <h1 style="color:#38bdf8;margin:0;font-size:24px;font-weight:800">CyberSentry</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a;margin:0 0 16px">Reset your password</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px">Hi {name}, click the button below to reset your password.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{link}" style="display:inline-block;background:#ef4444;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px">Reset my password</a>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="color:#7f1d1d;font-size:13px;margin:0">This link expires in 1 hour. If you didn't request this, ignore it.</p>
    </div>
    <div style="font-size:12px;color:#64748b;word-break:break-all;background:#f8fafc;padding:12px;border-radius:8px">{link}</div>
  </div>
</div></body></html>"""
    text = f"Hi {name},\n\nReset your CyberSentry password:\n{link}\n\nExpires in 1 hour."
    return send_email(to, "Reset your CyberSentry password", html, text)

def send_welcome_email(to, name):
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <div style="font-size:48px;margin-bottom:8px">&#127881;</div>
    <h1 style="color:#38bdf8;margin:0;font-size:24px;font-weight:800">Welcome to CyberSentry!</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a;margin:0 0 16px">Hi {name}, you're all set!</h2>
    <p style="color:#475569;line-height:1.6">Your account is verified and ready to use.</p>
    <div style="text-align:center;margin-top:32px">
      <a href="{APP_URL}/app" style="display:inline-block;background:#38bdf8;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px">Go to dashboard</a>
    </div>
  </div>
</div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Your account is verified. Go to {APP_URL}/app"
    return send_email(to, f"Welcome to CyberSentry, {name}!", html, text)
