import importlib.util
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("persistent_startup", Path(__file__).resolve().parents[1] / "api" / "start.py")
startup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup)


class PersistentStartupTests(unittest.TestCase):
    def test_railway_refuses_to_start_without_a_volume(self):
        with self.assertRaisesRegex(RuntimeError, "persistent volume"):
            startup.storage_path({"RAILWAY_ENVIRONMENT_ID": "production"})

    def test_database_cannot_escape_the_volume(self):
        for path in ("/app/cybersentry.db", "/data/../app/cybersentry.db", "/data"):
            with self.subTest(path=path), self.assertRaises(RuntimeError):
                startup.storage_path({"DB_PATH": path, "RAILWAY_VOLUME_MOUNT_PATH": "/data"})

    def test_relative_database_path_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "absolute"):
            startup.storage_path({"DB_PATH": "test.db"})

    def test_identity_and_account_rows_survive_new_connections(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "api.db"
            first, count = startup.storage_identity(path)
            self.assertEqual(count, 0)
            with sqlite3.connect(path) as connection:
                connection.execute("CREATE TABLE users (id TEXT PRIMARY KEY)")
                connection.execute("INSERT INTO users VALUES ('storage-test')")
            second, count = startup.storage_identity(path)
            self.assertEqual(first, second)
            self.assertEqual(count, 1)

    def test_bootstrap_drops_supplementary_groups_gid_then_uid(self):
        user = Mock(pw_uid=10001, pw_gid=10001, pw_name="cybersentry", pw_dir="/home/cybersentry")
        operations = Mock()
        with tempfile.TemporaryDirectory() as directory, patch.object(startup.pwd, "getpwnam", return_value=user), \
             patch.object(startup.os, "geteuid", side_effect=[0, 10001, 10001]), \
             patch.object(startup.os, "chown"), patch.object(startup.os, "chmod"), \
             patch.object(startup.os, "setgroups", operations.groups), \
             patch.object(startup.os, "setgid", operations.gid), patch.object(startup.os, "setuid", operations.uid), \
             patch.dict(os.environ):
            startup.prepare_user(Path(directory) / "api.db")
            self.assertEqual([call[0] for call in operations.mock_calls], ["groups", "gid", "uid"])
            self.assertEqual(os.environ["HOME"], "/home/cybersentry")


if __name__ == "__main__":
    unittest.main()
