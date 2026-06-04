import os, smtplib, secrets, hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

EMAIL_MODE     = os.environ.get("EMAIL_MODE", "terminal")
GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = ''.join(c for c in os.environ.get("GMAIL_APP_PASSWORD", "") if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER)
APP_URL        = os.environ.get("APP_URL", "http://localhost:3003")

print(f"EMAIL_SERVICE: mode={EMAIL_MODE} user={GMAIL_USER} pwd_len={len(GMAIL_PASSWORD)}")

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    if EMAIL_MODE == "sendgrid" and os.environ.get("SENDGRID_API_KEY"):
        return _sendgrid(to, subject, html, text)
    if EMAIL_MODE == "gmail" and GMAIL_USER and len(GMAIL_PASSWORD) > 10:
        return _gmail(to, subject, html, text)
    return _terminal(to, subject, html, text)

def _terminal(to, subject, html, text):
    print(f"\n{'='*60}\n📧 EMAIL — {subject}\nTO: {to}\n{'-'*60}\n{text}\n{'='*60}\n")
    return True

def _gmail(to, subject, html, text):
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
        print(f"✅ Gmail sent → {to}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Gmail auth failed: {e}")
        return _terminal(to, subject, html, text)
    except Exception as e:
        print(f"❌ Gmail error: {e}")
        return _terminal(to, subject, html, text)

def send_verification_email(to, name, token):
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:40px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;overflow:hidden">
<div style="background:#0f1629;padding:32px;text-align:center">
<h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Verify your email, {name}!</h2>
<p style="color:#475569">Click below to activate your account.</p>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Verify my email</a>
</div>
<p style="color:#94a3b8;font-size:12px">Or copy: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nVerify your email:\n{link}\n\nExpires in 24 hours."
    return send_email(to, "Verify your CyberSentry account", html, text)

def send_password_reset_email(to, name, token):
    link = f"{APP_URL}/reset-password?token={token}"
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:40px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;overflow:hidden">
<div style="background:#0f1629;padding:32px;text-align:center">
<h1 style="color:#38bdf8;margin:0">CyberSentry</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Reset your password</h2>
<p style="color:#475569">Hi {name}, click below to reset your password.</p>
<div style="text-align:center;margin:24px 0">
<a href="{link}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Reset my password</a>
</div>
<p style="color:#94a3b8;font-size:12px">Or copy: {link}</p>
</div></div></body></html>"""
    text = f"Hi {name},\n\nReset your password:\n{link}\n\nExpires in 1 hour."
    return send_email(to, "Reset your CyberSentry password", html, text)

def send_welcome_email(to, name):
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:40px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;overflow:hidden">
<div style="background:#0f1629;padding:32px;text-align:center">
<h1 style="color:#38bdf8;margin:0">Welcome to CyberSentry!</h1></div>
<div style="padding:32px">
<h2 style="color:#0f172a">Hi {name}, you are all set!</h2>
<p style="color:#475569">Your account is verified and ready.</p>
<div style="text-align:center;margin:24px 0">
<a href="{APP_URL}/app" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Go to dashboard</a>
</div></div></div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Go to {APP_URL}/app"
    return send_email(to, f"Welcome to CyberSentry!", html, text)


def _sendgrid(to, subject, html, text):
    try:
        import urllib.request, json
        data = json.dumps({
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": FROM_EMAIL or "noreply@cybersentry.app", "name": "CyberSentry"},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text},
                {"type": "text/html",  "value": html},
            ],
        }).encode()
        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={
                "Authorization": f"Bearer {os.environ.get('SENDGRID_API_KEY','')}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"✅ SendGrid sent → {to} [{r.status}]")
        return True
    except Exception as e:
        print(f"❌ SendGrid error: {e}")
        return _terminal(to, subject, html, text)
