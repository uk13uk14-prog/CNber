#!/usr/bin/env python3
"""Push P0 bundle to M1 and run m1P0Deploy.sh"""
import os
import sys
import stat

import paramiko
from scp import SCPClient

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_CNBER = "/Users/agent001/Desktop/CNber"
LOCAL_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)


def mkdir_p(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def upload_tree(sftp, local_dir, remote_dir):
    mkdir_p(sftp, remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace("\\", "/")
        rdir = remote_dir if rel == "." else f"{remote_dir}/{rel}"
        mkdir_p(sftp, rdir)
        for d in dirs:
            mkdir_p(sftp, f"{rdir}/{d}")
        for f in files:
            lp = os.path.join(root, f)
            rp = f"{rdir}/{f}"
            sftp.put(lp, rp)


def main():
    bundle_local = os.path.join(LOCAL_ROOT, "CNber_backend", "scripts", "m1-p0-bundle")
    deploy_sh = os.path.join(LOCAL_ROOT, "CNber_backend", "scripts", "m1P0Deploy.sh")
    seed_js = os.path.join(LOCAL_ROOT, "CNber_backend", "scripts", "seedPaymentAccounts.js")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    remote_scripts = f"{REMOTE_CNBER}/CNber_backend/scripts"
    mkdir_p(sftp, remote_scripts)

    print("Uploading m1-p0-bundle ...")
    upload_tree(sftp, bundle_local, f"{remote_scripts}/m1-p0-bundle")

    print("Uploading m1P0Deploy.sh & seedPaymentAccounts.js ...")

    def put_lf(local_path, remote_path):
        with open(local_path, "rb") as f:
            data = f.read().replace(b"\r\n", b"\n")
        with sftp.open(remote_path, "wb") as rf:
            rf.write(data)

    put_lf(deploy_sh, f"{remote_scripts}/m1P0Deploy.sh")
    put_lf(seed_js, f"{remote_scripts}/seedPaymentAccounts.js")
    sftp.chmod(f"{remote_scripts}/m1P0Deploy.sh", stat.S_IRWXU | stat.S_IRGRP | stat.S_IROTH)
    sftp.close()

    cmd = (
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        f"cd {REMOTE_CNBER} && bash CNber_backend/scripts/m1P0Deploy.sh"
    )
    print(f"Running: {cmd}\n")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    log_path = os.path.join(os.path.dirname(__file__), "_m1_deploy_last.log")
    with open(log_path, "w", encoding="utf-8") as lf:
        lf.write(out)
        if err.strip():
            lf.write("\n--- STDERR ---\n")
            lf.write(err)
    print(f"Log written: {log_path}")
    # 只打印末尾，避免 Windows 控制台 GBK 编码崩溃
    tail = out[-4000:] if len(out) > 4000 else out
    sys.stdout.buffer.write(tail.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")
    client.close()
    print(f"\nExit code: {code}")
    sys.exit(code)


if __name__ == "__main__":
    main()
