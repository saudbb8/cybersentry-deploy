import os, smtplib, secrets, hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Read directly from environment — no dotenv needed
EMAIL_MODE     = os.environ.get("EMAIL_MODE", "terminal")
GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = ''.join(c for c in os.environ.get("GMAIL_APP_PASSWORD", "") if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER)
APP_URL        = os.environ.get("APP_URL", "http://localhost:3003")

print(f"📧 Email service: MODE={EMAIL_MODE} USER={GMAIL_USER} PWD_LEN={len(GMAIL_PASSWORD)}")

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    print(f"📧 Sending email to {to} via {EMAIL_MODE}")
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
        print(f"✅ Email sent via Gmail → {to}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Gmail auth failed: {e}")
        return _terminal(to, subject, html, text)
    except Exception as e:
        print(f"❌ Gmail error: {e}")
        return _terminal(to, subject, html, text)

def send_verification_email(to, name, token):
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <h1 style="color:#38bdf8;margin:0;font-size:24px">CyberSentry</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a">Verify your email, {name}!</h2>
    <p style="color:#475569">Click below to activate your account.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{link}" style="background:#38bdf8;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700">Verify my email</a>
    </div>
    <p style="color:#94a3b8;font-size:13px">Expires in 24 hours. Link: {link}</p>
  </div>
</div></body></html>"""
    text = f"Hi {name},\n\nVerify your email:\n{link}\n\nExpires in 24 hours."
    return send_email(to, "Verify your CyberSentry account", html, text)

def send_password_reset_email(to, name, token):
    link = f"{APP_URL}/reset-password?token={token}"
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <h1 style="color:#38bdf8;margin:0;font-size:24px">CyberSentry</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a">Reset your password</h2>
    <p style="color:#475569">Hi {name}, click below to reset your password.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{link}" style="background:#ef4444;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700">Reset my password</a>
    </div>
    <p style="color:#94a3b8;font-size:13px">Expires in 1 hour. Link: {link}</p>
  </div>
</div></body></html>"""
    text = f"Hi {name},\n\nReset your password:\n{link}\n\nExpires in 1 hour."
    return send_email(to, "Reset your CyberSentry password", html, text)

def send_welcome_email(to, name):
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0f1629,#1a2140);padding:40px;text-align:center">
    <h1 style="color:#38bdf8;margin:0;font-size:24px">Welcome to CyberSentry!</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#0f172a">Hi {name}, you are all set!</h2>
    <p style="color:#475569">Your account is verified.</p>
    <div style="text-align:center;margin-top:32px">
      <a href="{APP_URL}/app" style="background:#38bdf8;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700">Go to dashboard</a>
    </div>
  </div>
</div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Go to {APP_URL}/app"
    return send_email(to, f"Welcome to CyberSentry!", html, text)
