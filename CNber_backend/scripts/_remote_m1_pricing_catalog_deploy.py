#!/usr/bin/env python3
"""Deploy pricing catalog configs + admin dist to M1."""
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
    "models/ServiceTypeConfig.js",
    "models/VehicleClassConfig.js",
    "models/FixedPricingRule.js",
    "models/RoutePricingRule.js",
    "utils/catalogConfig.js",
    "utils/fixedPricing.js",
    "utils/routePricing.js",
    "controllers/pricingConfigController.js",
    "controllers/fixedPricingController.js",
    "controllers/routePricingController.js",
    "routes/admin.js",
    "server.js",
    "scripts/seed_pricing_configs.js",
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
            put_lf(sftp, local_path, f"{remote_admin}/{rel}")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_ADMIN_DIST):
        print("ERROR: build admin first")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = client.open_sftp()

    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel)
        print(f"upload {rel}")
        put_lf(sftp, local_path, f"{REMOTE_BACKEND}/{rel.replace(chr(92), '/')}")

    print("upload admin dist")
    upload_admin_dist(sftp)
    sftp.close()

    for cmd in [
        f"cd {REMOTE_BACKEND} && node scripts/seed_pricing_configs.js",
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend",
        "sleep 2 && pm2 list | tail -5",
    ]:
        code, out, err = run(client, cmd)
        print(f"\n$ {cmd}\n{out}{err}")

    _, login_raw, _ = run(
        client,
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        f"-d '{json.dumps(LOGIN)}'",
    )
    token = json.loads(login_raw).get("data", {}).get("token", "")
    for path in [
        "/admin/pricing/service-types",
        "/admin/pricing/vehicle-classes",
        "/catalog/vehicle-classes",
    ]:
        _, body, _ = run(
            client,
            f"curl -s http://127.0.0.1:3100/api{path} "
            + (f"-H 'Authorization: Bearer {token}'" if path.startswith("/admin") else ""),
        )
        try:
            parsed = json.loads(body)
            count = len(parsed.get("data", {}).get("items", []))
            print(f"GET {path} items={count} code={parsed.get('code')}")
        except Exception:
            print(f"GET {path} raw={body[:120]}")

    client.close()
    print("\nM1 pricing catalog deploy done")


if __name__ == "__main__":
    main()
