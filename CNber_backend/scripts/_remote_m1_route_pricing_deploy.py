#!/usr/bin/env python3
"""Deploy V1 route pricing + vehicle class to M1."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_ADMIN_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0/dist")
)

BACKEND_FILES = [
    "models/RoutePricingRule.js",
    "models/FixedPricingRule.js",
    "models/Order.js",
    "utils/routePricing.js",
    "utils/fixedPricing.js",
    "utils/exchangeRate.js",
    "utils/orderPresentation.js",
    "utils/orderSoftDelete.js",
    "controllers/routePricingController.js",
    "controllers/fixedPricingController.js",
    "controllers/adminController.js",
    "controllers/orderController.js",
    "routes/admin.js",
    "scripts/seed_route_pricing_examples.js",
    "scripts/smoke_route_pricing.js",
]

LOGIN = {"phone": "13800000000", "password": "Admin123456"}


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


def run(client, cmd, timeout=300):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return stdout.channel.recv_exit_status(), out, err


def mkdir_p(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def upload_admin_dist(sftp):
    remote_admin = f"{REMOTE_BACKEND}/public/admin"
    mkdir_p(sftp, remote_admin)
    mkdir_p(sftp, f"{remote_admin}/assets")
    for root, _, files in os.walk(LOCAL_ADMIN_DIST):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, LOCAL_ADMIN_DIST).replace("\\", "/")
            remote_path = f"{remote_admin}/{rel}"
            put_lf(sftp, local_path, remote_path)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_ADMIN_DIST):
        print(f"ERROR: build admin first: {LOCAL_ADMIN_DIST}")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = client.open_sftp()

    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel)
        remote_path = f"{REMOTE_BACKEND}/{rel.replace(chr(92), '/')}"
        print(f"upload {rel}")
        put_lf(sftp, local_path, remote_path)

    print("upload admin dist")
    upload_admin_dist(sftp)
    sftp.close()

    cmds = [
        f"cd {REMOTE_BACKEND} && npm install --omit=dev 2>&1 | tail -3",
        f"cd {REMOTE_BACKEND} && node scripts/seed_route_pricing_examples.js",
        f"cd {REMOTE_BACKEND} && node scripts/smoke_route_pricing.js",
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend || pm2 restart all",
        "sleep 2 && pm2 list",
    ]
    for cmd in cmds:
        code, out, err = run(client, cmd)
        print(f"\n$ {cmd}\n{out}{err}")
        if code != 0 and "seed_route" not in cmd and "smoke_route" not in cmd:
            print(f"WARN exit {code}")

    code, out, err = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3000/api/auth/login -H 'Content-Type: application/json' -d '{json.dumps(LOGIN)}'",
    )
    print("\nlogin:", out[:200])
    try:
        token = json.loads(out).get("data", {}).get("token")
    except Exception:
        token = None
    if token:
        code, out, err = run(
            client,
            f"curl -s http://127.0.0.1:3000/api/admin/pricing/routes -H 'Authorization: Bearer {token}'",
        )
        print("\nroutes api:", out[:500])

    client.close()
    print("\nM1 route pricing deploy done")


if __name__ == "__main__":
    main()
