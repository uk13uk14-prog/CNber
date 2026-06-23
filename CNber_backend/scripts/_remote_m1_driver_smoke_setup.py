#!/usr/bin/env python3
"""M1: audit + seed test driver (password 123456) for smoke."""
import json
import os
import sys
import paramiko
from scp import SCPClient

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BASE = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

UPLOAD = [
    "scripts/_audit_test_driver_account.js",
    "scripts/seedTestDriver.js",
    "scripts/_prepare_smoke_assign_order.js",
]


def run(client, cmd, timeout=120):
    _, stdout, stderr = client.exec_command(
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; " + cmd,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", "replace").strip()
    err = stderr.read().decode("utf-8", "replace").strip()
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    with SCPClient(client.get_transport()) as scp:
        for rel in UPLOAD:
            local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
            remote_path = f"{REMOTE_BASE}/{rel}"
            print(f"Upload {rel}")
            scp.put(local_path, remote_path)

    print("\n=== Before seed: audit ===")
    code, out, err = run(client, f"cd {REMOTE_BASE} && node scripts/_audit_test_driver_account.js")
    print(out or err)
    if code != 0:
        print(f"audit exit {code}")

    print("\n=== seedTestDriver (password 123456) ===")
    code, out, err = run(client, f"cd {REMOTE_BASE} && node scripts/seedTestDriver.js")
    print(out or err)
    if err:
        print("stderr:", err)
    if code != 0:
        client.close()
        sys.exit(code)

    print("\n=== After seed: audit ===")
    code, out, err = run(client, f"cd {REMOTE_BASE} && node scripts/_audit_test_driver_account.js")
    print(out or err)

    print("\n=== curl login 123456 ===")
    code, out, err = run(
        client,
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13900000001\",\"password\":\"123456\"}'",
    )
    print(out)

    print("\n=== prepare smoke assign order ===")
    code, out, err = run(client, f"cd {REMOTE_BASE} && node scripts/_prepare_smoke_assign_order.js")
    print(out or err)

    client.close()


if __name__ == "__main__":
    main()
