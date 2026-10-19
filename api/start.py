"""Prepare persistent SQLite storage, then run the API without root privileges."""
import os
from pathlib import Path
import pwd
import sqlite3
import sys
from uuid import uuid4


def storage_path(environment):
    path = Path(environment.get("DB_PATH", "/data/cybersentry.db"))
    if not path.is_absolute():
        raise RuntimeError("DB_PATH must be absolute")
    mount = environment.get("RAILWAY_VOLUME_MOUNT_PATH")
    if environment.get("RAILWAY_ENVIRONMENT_ID") and not mount:
        raise RuntimeError("Attach the persistent volume before starting this Railway API")
    if mount:
        root = Path(mount).resolve()
        resolved = path.resolve()
        if resolved == root or not resolved.is_relative_to(root):
            raise RuntimeError("DB_PATH must be a file inside the mounted volume")
    return path


def prepare_user(path):
    user = pwd.getpwnam("cybersentry")
    path.parent.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        os.chown(path.parent, user.pw_uid, user.pw_gid)
        os.chmod(path.parent, 0o700)
        for candidate in (path, Path(str(path) + "-wal"), Path(str(path) + "-shm")):
            if candidate.is_symlink():
                raise RuntimeError("Database storage must not be a symlink")
            if candidate.exists():
                os.chown(candidate, user.pw_uid, user.pw_gid)
                os.chmod(candidate, 0o600)
        os.setgroups([])
        os.setgid(user.pw_gid)
        os.setuid(user.pw_uid)
    if os.geteuid() != user.pw_uid or os.geteuid() == 0:
        raise RuntimeError("The API must run as the cybersentry user")
    os.environ.update(HOME=user.pw_dir, USER=user.pw_name, LOGNAME=user.pw_name)


def storage_identity(path):
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS storage_identity (id INTEGER PRIMARY KEY CHECK(id=1), marker TEXT NOT NULL)")
        connection.execute("INSERT OR IGNORE INTO storage_identity(id, marker) VALUES (1, ?)", (uuid4().hex,))
        marker = connection.execute("SELECT marker FROM storage_identity WHERE id=1").fetchone()[0]
        exists = connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
        users = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0] if exists else 0
    return marker, users


def main():
    path = storage_path(os.environ)
    port = os.environ.get("PORT", "8080")
    if not port.isdecimal() or not 1 <= int(port) <= 65535:
        raise RuntimeError("PORT must be between 1 and 65535")
    os.environ["DB_PATH"] = str(path)
    os.umask(0o077)
    prepare_user(path)
    marker, users = storage_identity(path)
    print(f"Persistent storage ready: path={path} marker={marker} users={users} uid={os.geteuid()}", flush=True)
    os.execv(sys.executable, [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])


if __name__ == "__main__":
    main()
