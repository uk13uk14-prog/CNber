#!/usr/bin/env python3
"""Upload and run M1 admin rebuild script."""
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    put_lf(sftp, os.path.join(LOCAL_DIR, "_m1_check_available.js"), f"{REMOTE_BACKEND}/scripts/_m1_check_available.js")
    put_lf(
        sftp,
        os.path.join(LOCAL_DIR, "_m1_admin_rebuild.sh"),
        f"{REMOTE_BACKEND}/scripts/_m1_admin_rebuild.sh",
    )
    sftp.close()

    cmd = f"chmod +x {REMOTE_BACKEND}/scripts/_m1_admin_rebuild.sh && bash {REMOTE_BACKEND}/scripts/_m1_admin_rebuild.sh"
    _, stdout, stderr = client.exec_command(cmd, get_pty=True)

    while True:
        if stdout.channel.recv_ready():
            chunk = stdout.channel.recv(8192).decode("utf-8", errors="replace")
            if chunk:
                print(chunk, end="", flush=True)
        if stdout.channel.exit_status_ready():
            while stdout.channel.recv_ready():
                chunk = stdout.channel.recv(8192).decode("utf-8", errors="replace")
                if chunk:
                    print(chunk, end="", flush=True)
            break
        time.sleep(0.3)

    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print("STDERR:", err, file=sys.stderr)

    code = stdout.channel.recv_exit_status()
    client.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
