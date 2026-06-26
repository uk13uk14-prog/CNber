#!/usr/bin/env python3
"""Deploy operations dashboard V1 to M1: admin dist + backend files."""
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
    "models/User.js",
    "middlewares/authMiddleware.js",
    "utils/systemMetrics.js",
    "controllers/operationsDashboardController.js",
    "controllers/operationsPackController.js",
    "routes/admin.js",
]

ADMIN_SRC_FILES = [
    "src/views/OperationsDashboardView.vue",
    "src/api/admin.js",
    "src/utils/staffRoles.js",
    "src/utils/permissionMatrix.js",
    "src/router/index.js",
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
    print(f"\n$ {cmd[:200]}")
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
        print("ERROR: run npm run build in CNber_admin_web_v1.0 first")
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()

    print("\n=== upload admin dist (clean) ===")
    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    print(f"  uploaded dist -> {REMOTE_ADMIN}")

    print("\n=== upload backend ===")
    for rel in BACKEND_FILES:
        lp = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        if not os.path.isfile(lp):
            print(f"  MISSING local: {rel}")
            sys.exit(1)
        put_lf(sftp, lp, f"{REMOTE_BACKEND}/{rel}")
        print(f"  backend/{rel}")

    print("\n=== upload admin source (M1 rebuild fallback) ===")
    for rel in ADMIN_SRC_FILES:
        lp = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep))
        put_lf(sftp, lp, f"{ROOT}/CNber_admin_web_v1.0/{rel}")
        print(f"  admin-src/{rel}")

    sftp.close()

    print("\n=== restart backend ===")
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(4)

    print("\n=== verify ===")
    run(c, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")
    run(c, "curl -s -o /dev/null -w 'status HTTP %{http_code}\\n' http://127.0.0.1:3100/api/status")
    run(
        c,
        f"grep -rl '运营驾驶舱' {REMOTE_ADMIN}/assets/*.js 2>/dev/null | head -1 || echo 'bundle grep: not found'",
    )
    run(
        c,
        f"test -f {REMOTE_BACKEND}/controllers/operationsDashboardController.js && echo 'controller ok' || echo 'controller MISSING'",
    )
    run(
        c,
        f"grep -n 'dashboard/overview' {REMOTE_BACKEND}/routes/admin.js | head -3",
    )

    c.close()
    print("\nDONE — M1 operations dashboard V1 deployed")
    print("Hard refresh: http://192.168.1.187:3100/admin/operations-dashboard")


if __name__ == "__main__":
    main()
