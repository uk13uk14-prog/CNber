#!/usr/bin/env python3
"""Deploy P0 mobile fixes to M1."""
import os
import sys
import paramiko
from scp import SCPClient

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BASE = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

FILES = [
    "utils/fixedPricing.js",
    "controllers/driverController.js",
]


def run(client, cmd, timeout=180):
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    with SCPClient(client.get_transport()) as scp:
        for rel in FILES:
            local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
            remote_path = f"{REMOTE_BASE}/{rel}"
            print(f"Upload {rel}")
            scp.put(local_path, remote_path)

    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        f"cd {REMOTE_BASE} && pm2 restart cnber-backend --update-env && sleep 2 && pm2 status cnber-backend"
    )
    code, out = run(client, cmd)
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    client.close()
    print(f"\nExit: {code}")
    sys.exit(code)


if __name__ == "__main__":
    main()
