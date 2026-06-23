#!/usr/bin/env python3
"""Sync server.js body limit to M1 and restart pm2."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend/server.js"
LOCAL = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server.js"))


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    with open(LOCAL, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    with sftp.open(REMOTE, "wb") as rf:
        rf.write(data)
    sftp.close()

    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        "grep -n \"express.json\\|express.urlencoded\" /Users/agent001/Desktop/CNber/CNber_backend/server.js && "
        "cd /Users/agent001/Desktop/CNber/CNber_backend && "
        "pm2 restart cnber-backend --update-env && sleep 2 && "
        "pm2 list | grep cnber"
    )
    _, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print("STDERR:", err)
    client.close()
    print("M1 server.js synced and pm2 restarted.")


if __name__ == "__main__":
    main()
