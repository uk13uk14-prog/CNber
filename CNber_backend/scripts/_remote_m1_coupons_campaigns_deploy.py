#!/usr/bin/env python3
"""Deploy coupons/campaigns V1 to M1."""
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
    "models/Coupon.js",
    "models/Campaign.js",
    "utils/couponEngine.js",
    "controllers/couponController.js",
    "controllers/campaignController.js",
    "controllers/marketingPublicController.js",
    "routes/admin.js",
    "server.js",
    "scripts/seed_coupons_campaigns.js",
    "scripts/smoke_coupons_campaigns.js",
]

ADMIN_FILES = [
    "src/views/CouponsView.vue",
    "src/views/CampaignsView.vue",
    "src/api/admin.js",
    "src/utils/staffRoles.js",
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
    print("upload admin dist")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)

    for rel in BACKEND_FILES:
        put_lf(sftp, os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep)), f"{REMOTE_BACKEND}/{rel}")
        print(f"backend/{rel}")

    for rel in ADMIN_FILES:
        put_lf(
            sftp,
            os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep)),
            f"{ROOT}/CNber_admin_web_v1.0/{rel}",
        )
        print(f"admin-src/{rel}")

    sftp.close()
    run(c, f"cd {REMOTE_BACKEND} && node scripts/seed_coupons_campaigns.js")
    run(c, f"cd {REMOTE_BACKEND} && node scripts/smoke_coupons_campaigns.js")
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(3)

    run(
        c,
        "curl -s 'http://127.0.0.1:3100/api/public/coupons/validate?code=NEW100&serviceType=point&vehicleClass=standard_5&amountCny=900' | head -c 500",
    )
    run(c, "curl -s http://127.0.0.1:3100/api/public/campaigns | head -c 500")
    run(c, f"ls {REMOTE_ADMIN}/assets/CouponsView*.js 2>/dev/null")
    run(c, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")
    c.close()
    print("\nDONE")


if __name__ == "__main__":
    main()
