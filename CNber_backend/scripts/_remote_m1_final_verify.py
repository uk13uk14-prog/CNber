#!/usr/bin/env python3
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend/scripts/_m1_final_verify.js"
LOCAL = os.path.join(os.path.dirname(__file__), "_m1_final_verify.js")


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD)
    sftp = c.open_sftp()
    put_lf(sftp, LOCAL, REMOTE)
    sftp.close()
    _, stdout, stderr = c.exec_command(
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        "cd /Users/agent001/Desktop/CNber/CNber_backend && node scripts/_m1_final_verify.js"
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out)
    if err.strip():
        print(err)
    c.close()


if __name__ == "__main__":
    main()
