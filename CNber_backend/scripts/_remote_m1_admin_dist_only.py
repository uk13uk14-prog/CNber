#!/usr/bin/env python3
"""Upload admin dist only to M1 (pricing page fix)."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_ADMIN = "/Users/agent001/Desktop/CNber/CNber_backend/public/admin"
LOCAL_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0/dist")
)


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


def mkdir_p(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: run npm run build first")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = client.open_sftp()
    mkdir_p(sftp, REMOTE_ADMIN)
    mkdir_p(sftp, f"{REMOTE_ADMIN}/assets")

    count = 0
    for root, _, files in os.walk(LOCAL_DIST):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, LOCAL_DIST).replace("\\", "/")
            remote_path = f"{REMOTE_ADMIN}/{rel}"
            put_lf(sftp, local_path, remote_path)
            count += 1
            print(f"upload {rel}")

    sftp.close()
    client.close()
    print(f"done: {count} files -> M1 {REMOTE_ADMIN}")


if __name__ == "__main__":
    main()
