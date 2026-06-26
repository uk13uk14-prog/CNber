#!/usr/bin/env python3
"""Deploy admin menu fix (operations dashboard) to M1."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_ADMIN = "/Users/agent001/Desktop/CNber/CNber_backend/public/admin"
LOCAL_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0/dist")
)


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


def upload_tree(sftp, local_dir, remote_dir):
    for root, _, files in os.walk(local_dir):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, local_dir).replace("\\", "/")
            put_lf(sftp, local_path, f"{remote_dir}/{rel}")


def run(c, cmd):
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=60,
    )
    out = stdout.read().decode("utf-8", errors="replace").rstrip()
    if out:
        print(out)
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()
    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    sftp.close()
    run(c, "grep -rl '运营驾驶舱' /Users/agent001/Desktop/CNber/CNber_backend/public/admin/assets/*.js | head -3")
    run(c, "curl -s -o /dev/null -w 'admin %{http_code}\\n' http://127.0.0.1:3100/admin/")
    c.close()
    print("\nDONE — hard refresh /admin/operations-dashboard")


if __name__ == "__main__":
    main()
