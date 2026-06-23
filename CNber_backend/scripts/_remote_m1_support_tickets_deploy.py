#!/usr/bin/env python3
"""Deploy support tickets V1 to M1."""
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
REMOTE_BACKEND = f"{ROOT}/CNber_backend"
REMOTE_ADMIN = f"{REMOTE_BACKEND}/public/admin"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LOCAL_DIST = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/dist")
LOCAL_BACKEND = os.path.join(LOCAL_ROOT, "CNber_backend")

BACKEND_FILES = [
    "models/SupportTicket.js",
    "utils/supportTicket.js",
    "controllers/supportTicketController.js",
    "routes/admin.js",
    "scripts/smoke_support_tickets.js",
]


def put_lf(sftp, local_path, remote_path):
    remote_dir = os.path.dirname(remote_path.replace("\\", "/"))
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def upload_tree(sftp, local_dir, remote_dir):
    for root, _, files in os.walk(local_dir):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, local_dir).replace("\\", "/")
            put_lf(sftp, local_path, f"{remote_dir}/{rel}")


def run(c, cmd, timeout=120):
    print(f"\n$ {cmd[:180]}")
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out.rstrip())
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_DIST):
        print("run npm run build first")
        sys.exit(1)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()

    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    print("upload admin dist")

    for rel in BACKEND_FILES:
        put_lf(sftp, os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep)), f"{REMOTE_BACKEND}/{rel}")
        print(f"backend/{rel}")

    sftp.close()
    run(c, f"cd {REMOTE_BACKEND} && node scripts/smoke_support_tickets.js")
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(3)
    run(c, f"ls {REMOTE_ADMIN}/assets/SupportTicketsView*.js 2>/dev/null")
    c.close()
    print("\nDONE")


if __name__ == "__main__":
    main()
