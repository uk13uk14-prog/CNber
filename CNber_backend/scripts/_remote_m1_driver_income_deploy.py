#!/usr/bin/env python3
"""Deploy driver income center backend to M1."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

FILES = [
    "utils/driverIncome.js",
    "controllers/driverController.js",
    "routes/driver.js",
    "scripts/smoke_driver_income_center.js",
]


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(client, cmd):
    print(f"\n$ {cmd}")
    _, stdout, _ = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=120,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    for rel in FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"uploaded {rel}")

    sftp.close()

    run(client, f"cd {REMOTE_BACKEND} && node scripts/smoke_driver_income_center.js")
    run(client, f"cd {REMOTE_BACKEND} && node scripts/smoke_driver_settlement.js")
    run(client, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    run(client, "sleep 2")
    run(
        client,
        "curl -s -o /dev/null -w 'driver income summary route %{http_code}\\n' "
        "-H 'Authorization: Bearer invalid' http://127.0.0.1:3100/api/driver/income/summary",
    )

    client.close()
    print("\nDONE — M1 backend restarted")


if __name__ == "__main__":
    main()
