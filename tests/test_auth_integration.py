"""Exercise real FastAPI routes against a disposable SQLite DB; mail is mocked."""
import os
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4


class AuthIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        os.environ.update(DB_PATH=str(Path(cls.directory.name) / "test.db"),
                          JWT_SECRET="test-only-secret-not-used-in-production-12345678",
                          APP_URL="https://cybersentry-deploy.vercel.app",
                          ADMIN_EMAIL="", ADMIN_PASSWORD="")
        api = Path(os.environ.get("CS_TEST_API", str(Path(__file__).resolve().parents[1] / "api")))
        sys.path.insert(0, str(api.resolve()))
        import main
        from fastapi.testclient import TestClient
        from routers import auth, otp
        cls.auth, cls.otp = auth, otp
        cls.welcome = patch.object(auth, "send_welcome_email", return_value=True)
        cls.welcome.start()
        cls.client_context = TestClient(main.app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)
        cls.welcome.stop()
        import database
        database.engine.dispose()
        cls.directory.cleanup()

    def account(self):
        return {"name": "Integration Test", "email": f"{uuid4().hex}@example.invalid", "password": "Example-pass-123"}

    def test_registration_verification_login_and_password_recovery(self):
        account = self.account()
        with patch.object(self.auth, "send_verification_email", return_value=True) as mail:
            response = self.client.post("/api/auth/register", json=account)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["verification_email_sent"])
        login = {"email": account["email"], "password": account["password"]}
        self.assertEqual(self.client.post("/api/auth/login", json=login).status_code, 403)
        token = mail.call_args.args[2]
        verified = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login", json=login).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/verify-email", json={"token": token}).status_code, 400)
        with patch.object(self.otp, "send_otp_email", return_value=True) as mail:
            response = self.client.post("/api/otp/send", json={"email": account["email"]})
        self.assertEqual(response.status_code, 200)
        code = mail.call_args.args[2]
        response = self.client.post("/api/otp/verify", json={"email": account["email"], "otp": code})
        self.assertEqual(response.status_code, 200)
        reset_token = response.json()["reset_token"]
        self.assertEqual(self.client.post("/api/otp/verify", json={"email": account["email"], "otp": code}).status_code, 400)
        response = self.client.post("/api/auth/reset-password", json={"token": reset_token, "password": "Updated-pass-456"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login", json=login).status_code, 401)
        login["password"] = "Updated-pass-456"
        self.assertEqual(self.client.post("/api/auth/login", json=login).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/reset-password", json={"token": reset_token, "password": "Another-pass-789"}).status_code, 400)

    def test_mail_failure_preserves_account_and_resend_can_recover(self):
        account = self.account()
        with patch.object(self.auth, "send_verification_email", return_value=False):
            response = self.client.post("/api/auth/register", json=account)
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["verification_email_sent"])
            response = self.client.post("/api/auth/resend-verification", json={"email": account["email"]})
            self.assertEqual(response.status_code, 503)
        with patch.object(self.auth, "send_verification_email", return_value=True):
            response = self.client.post("/api/auth/resend-verification", json={"email": account["email"]})
        self.assertEqual(response.status_code, 200)

    def test_recovery_provider_failure_returns_retryable_error(self):
        account = self.account()
        with patch.object(self.auth, "send_verification_email", return_value=True):
            self.client.post("/api/auth/register", json=account)
        with patch.object(self.otp, "send_otp_email", return_value=False):
            response = self.client.post("/api/otp/send", json={"email": account["email"]})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(account["email"], self.otp._otp_store)

    def test_debug_verification_and_test_email_routes_are_removed(self):
        self.assertEqual(self.client.post("/admin/verify-user", json={}).status_code, 404)
        self.assertEqual(self.client.get("/admin/verify/anything/test@example.invalid").status_code, 404)
        self.assertEqual(self.client.get("/test-email/test@example.invalid").status_code, 404)

    def test_administrator_login_requires_explicit_configuration(self):
        response = self.client.post("/api/admin/login", json={"email": "test@example.invalid", "password": "invalid"})
        self.assertEqual(response.status_code, 503)

    def test_cors_allows_frontend_and_rejects_unlisted_origins(self):
        headers = {"Origin": "https://cybersentry-deploy.vercel.app", "Access-Control-Request-Method": "POST"}
        response = self.client.options("/api/auth/login", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], headers["Origin"])
        headers["Origin"] = "https://unlisted.example.invalid"
        self.assertEqual(self.client.options("/api/auth/login", headers=headers).status_code, 400)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(AuthIntegrationTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    Path(__file__).with_name("test-report.json").write_text(json.dumps({
        "passed": result.wasSuccessful(), "tests": result.testsRun,
        "failures": len(result.failures), "errors": len(result.errors),
        "scope": "FastAPI routes and temporary SQLite database; email delivery mocked"
    }))
    sys.exit(0 if result.wasSuccessful() else 1)
