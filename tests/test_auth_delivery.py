"""Offline regressions; provider calls and framework/ORM dependencies are mocked."""
import ast
import contextlib
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import importlib.util
import io
import json
from pathlib import Path
import secrets
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import MagicMock, Mock, patch
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("tested_email", ROOT / "api/email_service.py")
mail = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mail)


class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code, self.detail = status_code, detail


class User:
    email = id = None

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        self.id = "test-user"
        self.created_at = datetime.now(timezone.utc)
        self.scan_limit = 10


def load_functions(path, names, namespace):
    """Execute unchanged function bodies without importing third-party frameworks."""
    tree = ast.parse((ROOT / path).read_text())
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    for node in nodes:
        node.decorator_list = []
    namespace.update(HTTPException=HTTPException, Session=object, Depends=lambda _: None,
                     get_db=lambda: None, User=User, datetime=datetime, timezone=timezone,
                     timedelta=timedelta, secrets=secrets, hmac=hmac)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(ROOT / path), "exec"), namespace)
    return namespace


class EmailTests(unittest.TestCase):
    def setUp(self):
        self.config = patch.multiple(mail, GMAIL_USER="sender@example.invalid", GMAIL_PASSWORD="fake-password",
                                     FROM_EMAIL="sender@example.invalid", RESEND_API_KEY="",
                                     RESEND_FROM_EMAIL="sender@example.invalid")
        self.config.start()
        self.addCleanup(self.config.stop)

    def test_missing_configuration_does_not_claim_delivery(self):
        with patch.multiple(mail, GMAIL_USER="", GMAIL_PASSWORD=""), patch.object(mail.smtplib, "SMTP") as smtp:
            self.assertFalse(mail.send_email("to@example.invalid", "Subject", "HTML", "secret-code"))
            smtp.assert_not_called()

    def test_smtp_failure_has_timeout_and_never_prints_recovery_material(self):
        output = io.StringIO()
        with patch.object(mail.smtplib, "SMTP", side_effect=TimeoutError("blocked")) as smtp, \
                contextlib.redirect_stdout(output), self.assertLogs(mail.logger, level="ERROR") as logs:
            self.assertFalse(mail.send_email("to@example.invalid", "Subject", "HTML", "private-reset-token"))
        self.assertEqual(smtp.call_args.kwargs["timeout"], 8)
        self.assertNotIn("private-reset-token", output.getvalue() + " ".join(logs.output))

    def test_smtp_success_requires_recipient_acceptance(self):
        with patch.object(mail.smtplib, "SMTP") as smtp:
            connection = smtp.return_value.__enter__.return_value
            connection.sendmail.return_value = {}
            self.assertTrue(mail.send_email("to@example.invalid", "Subject", "HTML", "text"))
            self.assertTrue(connection.starttls.call_args.kwargs["context"].check_hostname)
            connection.sendmail.return_value = {"to@example.invalid": (550, b"rejected")}
            self.assertFalse(mail.send_email("to@example.invalid", "Subject", "HTML", "text"))

    def test_https_provider_is_shared_and_bounded(self):
        response = io.BytesIO(b'{"id":"accepted-message"}')
        response.status = 200
        with patch.object(mail, "RESEND_API_KEY", "fake-key"), \
                patch.object(mail.urllib.request, "urlopen", return_value=response) as send, \
                patch.object(mail.smtplib, "SMTP") as smtp:
            self.assertTrue(mail.send_verification_email("to@example.invalid", "Test", "private-token"))
            self.assertEqual(send.call_args.kwargs["timeout"], 8)
            payload = json.loads(send.call_args.args[0].data)
            self.assertIn("https://cybersentry-deploy.vercel.app/verify-email", payload["text"])
            smtp.assert_not_called()

    def test_rejected_https_request_is_not_reported_as_sent_or_retried_over_smtp(self):
        with patch.object(mail, "RESEND_API_KEY", "fake-key"), \
                patch.object(mail.urllib.request, "urlopen", side_effect=urllib.error.HTTPError(
                    "https://api.resend.com/emails", 403, "Forbidden", {}, None)), \
                patch.object(mail.smtplib, "SMTP") as smtp:
            self.assertFalse(mail.send_otp_email("to@example.invalid", "Test", "123456"))
            smtp.assert_not_called()


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.user = SimpleNamespace(id="test-user", name="Test", is_active=True)
        self.db = MagicMock()
        self.db.query.return_value.filter.return_value.first.return_value = self.user
        self.env = load_functions("api/routers/otp.py", {"generate_otp", "send_otp", "verify_otp"}, {
            "SendOTPRequest": object, "VerifyOTPRequest": object,
            "_otp_store": {}, "send_otp_email": Mock(return_value=True),
        })
        self.req = SimpleNamespace(email=" TEST@example.invalid ", method="email")

    def test_send_failure_is_visible_and_no_new_otp_is_saved(self):
        self.env["send_otp_email"].return_value = False
        with self.assertRaises(HTTPException) as error:
            self.env["send_otp"](self.req, self.db)
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(self.env["_otp_store"], {})

    def test_unknown_account_has_generic_response(self):
        self.db.query.return_value.filter.return_value.first.return_value = None
        self.assertIn("If this email is registered", self.env["send_otp"](self.req, self.db)["message"])
        self.env["send_otp_email"].assert_not_called()

    def test_sms_cannot_silently_claim_delivery(self):
        self.req.method = "sms"
        with self.assertRaises(HTTPException) as error:
            self.env["send_otp"](self.req, self.db)
        self.assertEqual(error.exception.status_code, 400)

    def test_successful_send_does_not_print_the_code(self):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.env["send_otp"](self.req, self.db)
        entry = self.env["_otp_store"]["test@example.invalid"]
        self.assertEqual(len(entry["otp"]), 6)
        self.assertNotIn(entry["otp"], output.getvalue())

    def test_expired_otp_is_rejected_and_removed(self):
        self.env["send_otp"](self.req, self.db)
        entry = self.env["_otp_store"]["test@example.invalid"]
        entry["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
        with self.assertRaises(HTTPException):
            self.env["verify_otp"](SimpleNamespace(email=self.req.email, otp=entry["otp"]), self.db)
        self.assertEqual(self.env["_otp_store"], {})

    def test_sixth_guess_is_rejected_even_when_correct(self):
        self.env["send_otp"](self.req, self.db)
        entry = self.env["_otp_store"]["test@example.invalid"]
        entry["attempts"] = 5
        with self.assertRaises(HTTPException) as error:
            self.env["verify_otp"](SimpleNamespace(email=self.req.email, otp=entry["otp"]), self.db)
        self.assertIn("Too many attempts", error.exception.detail)
        self.assertEqual(self.env["_otp_store"], {})

    def test_valid_code_can_only_be_used_once(self):
        self.env["send_otp"](self.req, self.db)
        entry = self.env["_otp_store"]["test@example.invalid"]
        auth = ModuleType("routers.auth")
        auth.make_token = Mock(return_value="reset-token")
        verify_request = SimpleNamespace(email=self.req.email, otp=entry["otp"])
        with patch.dict(sys.modules, {"routers.auth": auth}):
            result = self.env["verify_otp"](verify_request, self.db)
        self.assertEqual(result["reset_token"], "reset-token")
        with self.assertRaises(HTTPException):
            self.env["verify_otp"](verify_request, self.db)


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.env = load_functions("api/routers/auth.py", {"register", "user_response", "login"}, {
            "RegisterRequest": object, "LoginRequest": object,
            "get_current_user": lambda: None,
            "hash_password": lambda _: "fake-hash", "verify_password": lambda *_: True,
            "create_token": Mock(), "make_token": Mock(return_value="test-token"),
            "send_verification_email": Mock(return_value=False),
        })
        self.db = MagicMock()

    def test_created_account_survives_delivery_failure_and_response_is_honest(self):
        self.db.query.return_value.filter.return_value.first.return_value = None
        response = self.env["register"](SimpleNamespace(name="Test", email="test@example.invalid", password="test-pass-123"), self.db)
        self.assertFalse(response["verification_email_sent"])
        self.assertFalse(response["user"]["is_verified"])
        self.assertIn("could not be sent", response["message"])
        self.db.commit.assert_called_once()

    def test_unverified_account_cannot_login(self):
        self.db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(
            password_hash="fake", is_active=True, is_verified=False)
        with self.assertRaises(HTTPException) as error:
            self.env["login"](SimpleNamespace(email="test@example.invalid", password="test-pass-123"), self.db)
        self.assertEqual(error.exception.status_code, 403)
        self.env["create_token"].assert_not_called()


if __name__ == "__main__":
    unittest.main()
