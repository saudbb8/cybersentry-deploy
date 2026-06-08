import os, smtplib, secrets, hashlib, urllib.request, json, base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = ''.join(c for c in os.environ.get("GMAIL_APP_PASSWORD", "") if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER)
APP_URL        = os.environ.get("APP_URL", "http://localhost:3003")

print(f"EMAIL: user={GMAIL_USER} pwd_len={len(GMAIL_PASSWORD)}")

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    print(f"SENDING to={to}")
    # Try port 587
    for port, method in [(587, 'TLS'), (465, 'SSL'), (25, 'PLAIN')]:
        try:
            if port == 465:
                conn = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            else:
                conn = smtplib.SMTP("smtp.gmail.com", port)
                conn.ehlo()
                conn.starttls()
            conn.login(GMAIL_USER, GMAIL_PASSWORD)
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"CyberSentry <{FROM_EMAIL}>"
            msg["To"] = to
            msg.attach(MIMEText(text, "plain", "utf-8"))
            msg.attach(MIMEText(html, "html", "utf-8"))
            conn.sendmail(FROM_EMAIL, to, msg.as_string())
            conn.quit()
            print(f"✅ Email sent via port {port} to {to}")
            return True
        except Exception as e:
            print(f"❌ Port {port} failed: {e}")
    # Terminal fallback — always print OTP/link
    print(f"\n{'='*60}")
    print(f"📧 EMAIL — {subject}")
    print(f"TO: {to}")
    print(f"{'-'*60}")
    print(text)
    print(f"{'='*60}\n")
    return True

def send_verification_email(to, name, token):
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center"><h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Verify your email, {name}!</h2>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Verify my email</a>
</div>
<p style="color:#94a3b8;font-size:12px">Or copy: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nVerify your email:\n{link}\n\nExpires in 24 hours."
    return send_email(to, "Verify your CyberSentry account", html, text)

def send_password_reset_email(to, name, token):
    link = f"{APP_URL}/reset-password?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center"><h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Reset your password</h2>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Reset password</a>
</div>
<p style="color:#94a3b8;font-size:12px">Or copy: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nReset your password:\n{link}\n\nExpires in 1 hour."
    return send_email(to, "Reset your CyberSentry password", html, text)

def send_otp_email(to, name, otp):
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center"><h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px;text-align:center">
<h2>Your recovery code</h2>
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
<div style="background:#0f1629;padding:24px;text-align:center"><h1 style="color:#38bdf8;margin:0">Welcome!</h1></div>
<div style="padding:32px;text-align:center">
<h2>Hi {name}, you are all set!</h2>
<a href="{APP_URL}/app" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Go to dashboard</a>
</div></div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Go to {APP_URL}/app"
    return send_email(to, "Welcome to CyberSentry!", html, text)
