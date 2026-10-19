import os, smtplib, secrets, hashlib, urllib.request, json, logging, ssl
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = ''.join(c for c in os.environ.get("GMAIL_APP_PASSWORD", "") if ord(c) < 128).replace(" ", "").strip()
FROM_EMAIL     = os.environ.get("FROM_EMAIL", GMAIL_USER)
APP_URL        = os.environ.get("APP_URL", "https://cybersentry-deploy.vercel.app").rstrip("/")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", FROM_EMAIL).strip()
EMAIL_TIMEOUT = 8
logger = logging.getLogger(__name__)

def generate_token(): return secrets.token_urlsafe(32)
def hash_token(token): return hashlib.sha256(token.encode()).hexdigest()

def send_email(to, subject, html, text):
    """Return True only after the provider accepts the message; never log its body."""
    if RESEND_API_KEY:
        if not RESEND_FROM_EMAIL:
            logger.error("Email sender is not configured")
            return False
        payload = json.dumps({"from": RESEND_FROM_EMAIL, "to": [to],
                              "subject": subject, "html": html, "text": text}).encode()
        request = urllib.request.Request(
            "https://api.resend.com/emails", data=payload, method="POST",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}",
                     "Content-Type": "application/json", "User-Agent": "CyberSentry/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=EMAIL_TIMEOUT) as response:
                result = json.load(response)
                return 200 <= response.status < 300 and bool(result.get("id"))
        except Exception as exc:
            logger.error("Email API request failed (%s)", type(exc).__name__)
            return False
    if not GMAIL_USER or not GMAIL_PASSWORD:
        logger.error("Email credentials are not configured")
        return False
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"CyberSentry <{FROM_EMAIL or GMAIL_USER}>"
        message["To"] = to
        message.attach(MIMEText(text, "plain", "utf-8"))
        message.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=EMAIL_TIMEOUT) as connection:
            connection.ehlo()
            connection.starttls(context=ssl.create_default_context())
            connection.ehlo()
            connection.login(GMAIL_USER, GMAIL_PASSWORD)
            rejected = connection.sendmail(FROM_EMAIL or GMAIL_USER, [to], message.as_string())
            return not rejected
    except Exception as exc:
        logger.error("SMTP delivery failed (%s)", type(exc).__name__)
        return False

def send_verification_email(to, name, token):
    name = escape(name)
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
    name = escape(name)
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
    name = escape(name)
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
    name = escape(name)
    html = f"""<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#0f1629;padding:24px;text-align:center"><h1 style="color:#38bdf8;margin:0">Welcome!</h1></div>
<div style="padding:32px;text-align:center">
<h2>Hi {name}, you are all set!</h2>
<a href="{APP_URL}/app" style="background:#38bdf8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Go to dashboard</a>
</div></div></body></html>"""
    text = f"Welcome to CyberSentry, {name}! Go to {APP_URL}/app"
    return send_email(to, "Welcome to CyberSentry!", html, text)
