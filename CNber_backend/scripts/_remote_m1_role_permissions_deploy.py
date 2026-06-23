#!/usr/bin/env python3
"""Deploy role permissions V2 to M1: admin dist + backend permission files."""
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
    "utils/permissionMatrix.js",
    "models/RolePermission.js",
    "services/rolePermissionService.js",
    "controllers/rolePermissionController.js",
    "middlewares/staffAccess.js",
    "routes/admin.js",
    "scripts/smoke_role_permissions.js",
]

ADMIN_SRC_FILES = [
    "src/utils/permissionMatrix.js",
    "src/stores/auth.js",
    "src/api/admin.js",
    "src/utils/staffRoles.js",
    "src/layouts/MainLayout.vue",
    "src/router/index.js",
    "src/views/RolesView.vue",
    "src/views/LoginView.vue",
    "src/views/ForbiddenView.vue",
    "src/views/CouponsView.vue",
    "src/views/CampaignsView.vue",
    "src/views/CRMMarketingView.vue",
    "src/views/StaffView.vue",
    "src/views/SystemSettingsView.vue",
    "src/views/DriverSettlementsView.vue",
    "src/views/SupportTicketsView.vue",
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

    print("upload admin dist (clean)")
    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)

    print("upload backend")
    for rel in BACKEND_FILES:
        put_lf(sftp, os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep)), f"{REMOTE_BACKEND}/{rel}")
        print(f"  backend/{rel}")

    for rel in ADMIN_SRC_FILES:
        put_lf(
            sftp,
            os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep)),
            f"{ROOT}/CNber_admin_web_v1.0/{rel}",
        )
        print(f"  admin-src/{rel}")

    sftp.close()
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(3)

    run(c, f"grep -o '权限 V2' {REMOTE_ADMIN}/assets/MainLayout*.js | head -1")
    run(c, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")
    run(c, f"cd {REMOTE_BACKEND} && node scripts/smoke_role_permissions.js")
    c.close()
    print("\nDONE — M1 role permissions V2 deployed")


if __name__ == "__main__":
    main()
