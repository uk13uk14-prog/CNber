#!/usr/bin/env python3
"""Deploy V1 fixed pricing to M1."""
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
    "models/FixedPricingRule.js",
    "models/Order.js",
    "utils/fixedPricing.js",
    "utils/exchangeRate.js",
    "utils/orderPresentation.js",
    "utils/orderSoftDelete.js",
    "controllers/fixedPricingController.js",
    "controllers/adminController.js",
    "controllers/orderController.js",
    "routes/admin.js",
    "scripts/seed_fixed_pricing.js",
    "scripts/smoke_fixed_pricing.js",
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


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_ADMIN_DIST):
        print(f"ERROR: build admin first: {LOCAL_ADMIN_DIST}")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    print("\n=== Upload backend ===")
    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        put_lf(sftp, local_path, f"{REMOTE_BACKEND}/{rel}")
        print(f"  {rel}")

    print("\n=== Upload public/admin ===")
    remote_admin = f"{REMOTE_BACKEND}/public/admin"
    run(client, f"mkdir -p {remote_admin} && rm -rf {remote_admin}/*")
    count = 0
    for root, _, files in os.walk(LOCAL_ADMIN_DIST):
        rel = os.path.relpath(root, LOCAL_ADMIN_DIST).replace("\\", "/")
        rdir = remote_admin if rel == "." else f"{remote_admin}/{rel}"
        mkdir_p(sftp, rdir)
        for f in files:
            put_lf(sftp, os.path.join(root, f), f"{rdir}/{f}")
            count += 1
    print(f"  {count} files")
    sftp.close()

    steps = [
        f"cd {REMOTE_BACKEND} && npm install",
        f"cd {REMOTE_BACKEND} && node scripts/seed_fixed_pricing.js",
        f"cd {REMOTE_BACKEND} && node scripts/smoke_fixed_pricing.js",
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env",
        "sleep 3",
    ]
    for step in steps:
        print(f"\n>>> {step}")
        code, out, err = run(client, step, timeout=600)
        print((out or err)[-2500:])
        if code != 0 and "smoke" in step:
            client.close()
            sys.exit(code)

    login = json.dumps(LOGIN)
    _, out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login -H 'Content-Type: application/json' -d '{login}'",
    )
    token = json.loads(out)["data"]["token"]
    _, out, _ = run(
        client,
        f"curl -s http://127.0.0.1:3100/api/admin/pricing/fixed -H 'Authorization: Bearer {token}'",
    )
    print("\nGET /api/admin/pricing/fixed:")
    print(out[:800])
    _, out, _ = run(
        client,
        f"grep -l 'V1 固定报价' {REMOTE_BACKEND}/public/admin/assets/PricingRulesView*.js | head -1",
    )
    print("\nAdmin bundle:", out.strip())
    client.close()
    print("\n=== M1 fixed pricing deploy complete ===")


if __name__ == "__main__":
    main()
