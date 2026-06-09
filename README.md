# 🛡️ CyberSentry

**Developer-first Security Platform** — Web Application Firewall + SaaS Dashboard + PyPI Package

[![PyPI](https://img.shields.io/pypi/v/cybersentry-saud)](https://pypi.org/project/cybersentry-saud/)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://python.org)
[![Detection Rate](https://img.shields.io/badge/detection%20rate-100%25-green)](https://github.com/saudbb8/cybersentry)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🔗 Live Demo

| Service | URL |
|---------|-----|
| 🌐 SaaS Platform | [cybersentry-deploy.vercel.app](https://cybersentry-deploy.vercel.app) |
| ⚙️ Backend API | [cybersentry-deploy-production.up.railway.app](https://cybersentry-deploy-production.up.railway.app) |
| 📚 API Docs | [/docs](https://cybersentry-deploy-production.up.railway.app/docs) |
| 📦 PyPI Package | [pip install cybersentry-saud](https://pypi.org/project/cybersentry-saud/) |

---

## 🚀 Quick Start

```bash
pip install cybersentry-saud
```

```python
from fastapi import FastAPI
from cybersentry.middleware import HardenedMiddleware

app = FastAPI()
app.add_middleware(HardenedMiddleware)

# That's it — your app now has 6 defence layers!
```

---

## 🏗️ What's Inside

### Core Security Engine
A Python middleware library that protects any FastAPI or Flask application with **6 defence layers**:

| Layer | Protection |
|-------|-----------|
| 🔍 IP Reputation | Blocks Tor exit nodes, Shodan scanners, abusive IPs |
| 🌊 DDoS Guard | Rate limiting and flood protection |
| 🤖 Bot Detection | Fingerprints sqlmap, Nikto, Nmap and scrapers |
| 🛡️ OWASP Rules | 32 rules covering all OWASP Top 10 categories |
| 🍯 Honeypot Traps | Decoy endpoints that auto-ban attackers |
| 🔒 Security Headers | HSTS, CSP, X-Frame-Options on all responses |

### Detection Coverage

| Attack Type | Rules | Detection Rate |
|-------------|-------|----------------|
| SQL Injection | 8 rules | ✅ 100% |
| Cross-Site Scripting (XSS) | 6 rules | ✅ 100% |
| Command Injection | 5 rules | ✅ 100% |
| Path Traversal | 4 rules | ✅ 100% |
| SSRF | 4 rules | ✅ 100% |
| JWT Attacks | 3 rules | ✅ 100% |
| NoSQL Injection | 2 rules | ✅ 100% |
| **Total** | **32 rules** | **✅ 100% (43/43)** |

### SaaS Platform
Full web application at [cybersentry-deploy.vercel.app](https://cybersentry-deploy.vercel.app):

- 🔐 **Auth** — Register, email verification, forgot password, OTP recovery
- 📊 **Dashboard** — Live attack feed, security score, charts
- 🔍 **Scanner** — Scan code for vulnerabilities
- 🧨 **Attack Simulator** — Test your own app against real attacks
- 📄 **Reports** — PDF and HTML security audit reports
- 🔥 **Firewall** — IP blocking, country blocking, custom rules
- 👤 **Admin Panel** — User management at `/admin`

---

## 📁 Project Structure

```
cybersentry/                    ← Core engine (PyPI package)
├── cybersentry/
│   ├── middleware.py           ← HardenedMiddleware (6 layers)
│   ├── core/
│   │   ├── rules/              ← 32 OWASP detection rules
│   │   ├── defense/            ← 6 defence layer implementations
│   │   └── geo_lookup.py       ← Geo tracking (country, city, ISP)
│   └── cli/                    ← 9 CLI commands
├── demo_app.py                 ← FastAPI demo app (port 8000)
├── tests/                      ← 43 attack test cases
└── pyproject.toml

cybersentry-saas/               ← SaaS platform
├── api/                        ← FastAPI backend (port 8001)
│   ├── main.py
│   ├── database.py             ← SQLAlchemy models
│   ├── auth_utils.py           ← JWT authentication
│   ├── email_service.py        ← Gmail email service
│   └── routers/
│       ├── auth.py             ← Register, login, verify, OTP
│       ├── scan.py             ← Code vulnerability scanner
│       ├── firewall.py         ← Firewall rule management
│       ├── admin.py            ← Admin dashboard API
│       ├── dashboard.py        ← Live stats
│       └── otp.py              ← OTP recovery
└── frontend/                   ← React + Vite (port 3003)
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── Dashboard.jsx
        │   ├── ScanPage.jsx
        │   ├── AttackPage.jsx
        │   ├── FirewallPage.jsx
        │   ├── ReportsPage.jsx
        │   ├── AdminPage.jsx
        │   └── AuthPages.jsx
        └── hooks/
```

---

## 🛠️ Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Setup

```bash
# Clone repos
git clone https://github.com/saudbb8/cybersentry
git clone https://github.com/saudbb8/cybersentry-deploy

# Create virtual environment
python3 -m venv cybersentry/.venv
source cybersentry/.venv/bin/activate

# Install core engine
cd cybersentry
pip install -e .

# Install SaaS dependencies
cd ../cybersentry-deploy/api
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

Create `cybersentry-deploy/api/.env`:

```env
EMAIL_MODE=gmail
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your16charapppassword
FROM_EMAIL=your@gmail.com
APP_URL=http://localhost:3003
JWT_SECRET=your-secret-key-here
ADMIN_EMAIL=your@gmail.com
ADMIN_PASSWORD=Admin@Cyber2026
DB_PATH=./cybersentry.db
```

### Start All Services

```bash
bash ~/Documents/start-cybersentry.sh
```

Or individually:

```bash
# Port 8000 — Demo attack app
python3 cybersentry/demo_app.py &

# Port 8001 — SaaS API
cd cybersentry-deploy/api && uvicorn main:app --port 8001 --reload &

# Port 3002 — Dev dashboard
cd cybersentry-frontend && npm run dev &

# Port 3003 — SaaS platform
cd cybersentry-deploy/frontend && npm run dev &
```

### URLs

| Service | URL |
|---------|-----|
| SaaS Platform | http://localhost:3003 |
| Dev Dashboard | http://localhost:3002 |
| SaaS API Docs | http://localhost:8001/docs |
| Demo Attack App | http://localhost:8000 |
| Admin Panel | http://localhost:3003/admin |

---

## 🧪 Running Tests

```bash
cd cybersentry
source .venv/bin/activate

# Run all 43 attack tests
python3 -m pytest tests/ -v

# Run specific test category
python3 -m pytest tests/test_sqli.py -v
python3 -m pytest tests/test_xss.py -v
```

Expected output:
```
43 passed, 0 failed
Detection rate: 100% (43/43)
False positives: 0
```

---

## 🌐 Deployment

### Backend → Railway

1. Connect `saudbb8/cybersentry-deploy` to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on every push

### Frontend → Vercel

1. Connect `saudbb8/cybersentry-deploy` to Vercel
2. Set Root Directory: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app`

---

## 💰 Pricing Plans

| Plan | Price | Features |
|------|-------|---------|
| **Free** | $0/month | 10 scans/day, full OWASP detection, 1 API key |
| **Pro** | $29/month | Unlimited scans, live dashboard, geo tracking, 10 API keys |
| **Team** | $99/month | 5 seats, shared dashboard, custom rules, SLA |

---

## 📊 Tech Stack

| Component | Technology |
|-----------|-----------|
| Security Engine | Python 3.11, custom OWASP rules |
| Backend API | FastAPI, SQLAlchemy, JWT, SQLite |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Email | Gmail SMTP with App Password |
| Deployment | Railway (backend), Vercel (frontend) |
| Package | PyPI — cybersentry-saud |

---

## 🔑 Admin Access

Access the admin panel at `/admin`:

```
URL:      https://cybersentry-deploy.vercel.app/admin
Email:    your admin email
Password: Admin@Cyber2026 (change in production!)
```

Admin features:
- View all registered users
- Verify / ban / unban users
- Change user plans
- View all scan history
- Monitor system stats

---

## 📄 API Reference

Full API documentation available at:
```
https://cybersentry-deploy-production.up.railway.app/docs
```

Key endpoints:

```
POST /api/auth/register        — Create account
POST /api/auth/login           — Sign in
POST /api/auth/verify-email    — Verify email with token
POST /api/auth/forgot-password — Send reset email
POST /api/auth/reset-password  — Reset with token
POST /api/otp/send             — Send OTP code
POST /api/otp/verify           — Verify OTP
POST /api/scan/code            — Scan code for vulnerabilities
GET  /api/scan/history         — Get scan history
GET  /api/firewall/rules       — Get firewall rules
POST /api/firewall/block-ip    — Block an IP address
GET  /api/admin/stats          — Admin statistics
GET  /api/admin/users          — All users (admin only)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-rule`
3. Add your OWASP detection rule in `cybersentry/core/rules/`
4. Add a test case in `tests/`
5. Run tests: `pytest tests/ -v`
6. Submit a pull request

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Saud BB**
- GitHub: [@saudbb8](https://github.com/saudbb8)
- PyPI: [cybersentry-saud](https://pypi.org/project/cybersentry-saud/)
- Live: [cybersentry-deploy.vercel.app](https://cybersentry-deploy.vercel.app)

---

<p align="center">
  Built with ❤️ for developers who ship fast and secure
  <br>
  <strong>pip install cybersentry-saud</strong>
</p>
