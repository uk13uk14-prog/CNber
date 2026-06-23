#!/usr/bin/env python3
"""Sync P0 ops/finance/driver-onboarding backend files to M1 and verify APIs."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SYNC_FILES = [
    "controllers/p0OperationsController.js",
    "controllers/driverOnboardingController.js",
    "utils/enrichOrderPayments.js",
    "utils/orderFinanceSnapshot.js",
    "routes/admin.js",
]

VERIFY_PATHS = [
    "/api/admin/payment-reviews",
    "/api/admin/finance/reconciliation",
    "/api/admin/drivers/onboarding",
]

LOGIN = {"phone": "13800000000", "password": "Admin123456"}


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(client, cmd):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}"
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    uploaded = []
    for rel in SYNC_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        if not os.path.isfile(local_path):
            print(f"ERROR: missing local file {local_path}")
            sys.exit(1)
        put_lf(sftp, local_path, remote_path)
        uploaded.append(rel)
        print(f"  uploaded {rel}")
    sftp.close()

    print("\nRestarting pm2 ...")
    code, out, err = run(
        client,
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env && sleep 2 && pm2 list | grep cnber",
    )
    print(out or err)
    if code != 0:
        print(f"pm2 restart failed exit={code}")
        sys.exit(code)

    print("\nLogging in ...")
    login_payload = json.dumps(LOGIN)
    code, out, err = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_payload}'",
    )
    if code != 0:
        print("login curl failed", err)
        sys.exit(1)
    try:
        body = json.loads(out)
        token = body["data"]["token"]
    except (json.JSONDecodeError, KeyError):
        print("login response:", out)
        sys.exit(1)
    print("  token OK")

    print("\nAPI verification:")
    results = []
    for path in VERIFY_PATHS:
        code, out, err = run(
            client,
            f"curl -s -o /tmp/cnber_resp.json -w '%{{http_code}}' "
            f"http://127.0.0.1:3100{path} "
            f"-H 'Authorization: Bearer {token}'",
        )
        http_code = out.strip()
        _, body_out, _ = run(client, "cat /tmp/cnber_resp.json")
        msg = ""
        try:
            msg = json.loads(body_out).get("message", "")
        except json.JSONDecodeError:
            msg = body_out[:120]
        results.append((path, http_code, msg))
        print(f"  {path} -> HTTP {http_code} ({msg or 'ok'})")

    client.close()

    print("\n=== SYNC SUMMARY ===")
    print("Uploaded:")
    for f in uploaded:
        print(f"  - {f}")
    print("\nHTTP results:")
    for path, http_code, msg in results:
        print(f"  {path}: {http_code}")

    failed = [r for r in results if r[1] != "200"]
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
