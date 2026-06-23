#!/usr/bin/env python3
"""Deploy driver online-status fix to M1 and verify APIs."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

UPLOADS = [
    ("models/Driver.js", "models/Driver.js"),
    ("controllers/driverController.js", "controllers/driverController.js"),
    ("controllers/adminController.js", "controllers/adminController.js"),
    ("routes/driver.js", "routes/driver.js"),
    ("scripts/seedTestDriver.js", "scripts/seedTestDriver.js"),
]


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
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    for rel_local, rel_remote in UPLOADS:
        local_path = os.path.join(ROOT, rel_local)
        remote_path = f"{REMOTE_BACKEND}/{rel_remote}"
        put_lf(sftp, local_path, remote_path)
        print(f"Uploaded {rel_remote}")
    sftp.close()

    code, out, err = run(client, f"cd {REMOTE_BACKEND} && node scripts/seedTestDriver.js")
    print(out)
    if err.strip():
        print("seed stderr:", err)
    if code != 0:
        sys.exit(code)

    run(client, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env && sleep 2")

    driver_login = json.dumps({"phone": "13900000001", "password": "123456"})
    _, driver_login_out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{driver_login}'",
    )
    driver_tok = json.loads(driver_login_out)["data"]["token"]

    _, status_out, _ = run(
        client,
        "curl -s -X POST http://127.0.0.1:3100/api/driver/status "
        f"-H 'Authorization: Bearer {driver_tok}' "
        "-H 'Content-Type: application/json' "
        "-d '{\"status\":\"online\"}'",
    )
    print("\n=== POST /driver/status online ===")
    print(status_out)

    admin_login = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, admin_login_out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{admin_login}'",
    )
    admin_tok = json.loads(admin_login_out)["data"]["token"]

    for label, path in [
        ("drivers/available", "/api/admin/drivers/available"),
        ("drivers/for-dispatch", "/api/admin/drivers/for-dispatch"),
    ]:
        _, body, _ = run(
            client,
            f"curl -s 'http://192.168.1.187:3100{path}' "
            f"-H 'Authorization: Bearer {admin_tok}'",
        )
        data = json.loads(body)
        print(f"\n=== GET {path} ===")
        if label == "drivers/available":
            rows = data.get("data") or []
            phones = [r.get("phone") for r in rows]
            print(f"code={data.get('code')} count={len(rows)} phones={phones}")
        else:
            drivers = (data.get("data") or {}).get("drivers") or []
            phones = []
            for d in drivers:
                u = d.get("userId") or {}
                phones.append(u.get("phone") if isinstance(u, dict) else None)
            print(f"code={data.get('code')} total={len(drivers)} phones={phones}")

    client.close()


if __name__ == "__main__":
    main()
