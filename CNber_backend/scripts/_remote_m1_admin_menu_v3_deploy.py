#!/usr/bin/env python3
"""Force-deploy admin menu V3 (top-level 运营驾驶舱) to M1."""
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
REMOTE_ADMIN = f"{ROOT}/CNber_backend/public/admin"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LOCAL_DIST = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/dist")

ADMIN_SRC = [
    "src/layouts/MainLayout.vue",
    "src/utils/staffRoles.js",
    "src/utils/permissionMatrix.js",
    "src/router/index.js",
    "index.html",
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
    n = 0
    for root, _, files in os.walk(local_dir):
        for name in files:
            put_lf(sftp, os.path.join(root, name), f"{remote_dir}/{os.path.relpath(os.path.join(root, name), local_dir).replace(chr(92), '/')}")
            n += 1
    return n


def run(c, cmd, timeout=90):
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
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: run npm run build first")
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()

    run(c, "pm2 show cnber-backend 2>/dev/null | grep -E 'script path|exec cwd' || true")
    run(c, f"ls -la {REMOTE_ADMIN}/index.html")

    print("\n=== wipe + upload dist ===")
    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    count = upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    print(f"uploaded {count} files")

    print("\n=== upload admin source (M1 fallback) ===")
    for rel in ADMIN_SRC:
        put_lf(
            sftp,
            os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep)),
            f"{ROOT}/CNber_admin_web_v1.0/{rel}",
        )
        print(f"  {rel}")

    sftp.close()

    run(c, f"cd {ROOT}/CNber_backend && pm2 restart cnber-backend --update-env")
    time.sleep(4)

    run(c, "curl -s http://127.0.0.1:3100/admin/ | head -15")
    run(c, f"grep -rl '菜单 V3' {REMOTE_ADMIN}/assets/*.js 2>/dev/null | head -2")
    run(c, f"grep -rl 'operations-dashboard' {REMOTE_ADMIN}/assets/MainLayout*.js {REMOTE_ADMIN}/assets/index*.js 2>/dev/null | head -5")

    c.close()
    print("\nDONE — open http://192.168.1.187:3100/admin/?v=menu-v3 and Ctrl+Shift+R")
    print("Left sidebar should show: 工作台 + 运营驾驶舱 (top level)")


if __name__ == "__main__":
    main()
