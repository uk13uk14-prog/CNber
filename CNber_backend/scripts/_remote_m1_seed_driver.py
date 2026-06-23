#!/usr/bin/env python3
"""Seed test driver on M1 and verify admin driver APIs."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_SEED = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "seedTestDriver.js")
)


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
    put_lf(sftp, LOCAL_SEED, f"{REMOTE_BACKEND}/scripts/seedTestDriver.js")
    sftp.close()
    print("Uploaded seedTestDriver.js")

    code, out, err = run(client, f"cd {REMOTE_BACKEND} && node scripts/seedTestDriver.js")
    print(out)
    if err.strip():
        print("ERR:", err)
    if code != 0:
        sys.exit(code)

    run(client, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env && sleep 2")

    login = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, login_out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login}'",
    )
    tok = json.loads(login_out)["data"]["token"]

    for label, path in [
        ("drivers list", "/api/admin/drivers?page=1&pageSize=10"),
        ("drivers available", "/api/admin/drivers/available"),
        ("drivers for-dispatch", "/api/admin/drivers/for-dispatch"),
    ]:
        _, body, _ = run(
            client,
            f"curl -s 'http://127.0.0.1:3100{path}' "
            f"-H 'Authorization: Bearer {tok}'",
        )
        try:
            data = json.loads(body)
            if label == "drivers list":
                n = len((data.get("data") or {}).get("drivers") or [])
            elif label == "drivers available":
                n = len(data.get("data") or [])
            else:
                n = (data.get("data") or {}).get("total", 0)
            print(f"{label}: count={n} code={data.get('code')}")
        except json.JSONDecodeError:
            print(f"{label}: {body[:120]}")

    client.close()


if __name__ == "__main__":
    main()
