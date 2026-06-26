#!/usr/bin/env python3
"""Deploy macOS memory_pressure fix to M1."""
import json
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
    print(f"\n$ {cmd[:220]}")
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace").rstrip()
    if out:
        print(out)
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()

    put_lf(
        sftp,
        os.path.join(LOCAL_ROOT, "CNber_backend/utils/systemMetrics.js"),
        f"{REMOTE_BACKEND}/utils/systemMetrics.js",
    )
    print("uploaded utils/systemMetrics.js")

    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    print("uploaded admin dist")

    sftp.close()
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(5)

    run(c, "memory_pressure 2>/dev/null | grep -i 'System-wide memory free percentage' | head -1")
    run(
        c,
        "TOKEN=$(curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}' "
        "| python3 -c \"import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))\") && "
        "curl -s -H \"Authorization: Bearer $TOKEN\" http://127.0.0.1:3100/api/admin/system/health",
        timeout=60,
    )

    c.close()
    print("\nDONE")


if __name__ == "__main__":
    main()
