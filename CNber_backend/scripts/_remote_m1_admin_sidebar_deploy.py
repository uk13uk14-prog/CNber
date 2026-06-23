#!/usr/bin/env python3
"""M1 Admin sidebar V2: wipe public/admin, upload dist, restart pm2, verify."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
REMOTE_ADMIN = f"{REMOTE_ROOT}/public/admin"
LOCAL_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0/dist")
)


def run(client, cmd, timeout=120):
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    return out


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


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not os.path.isdir(LOCAL_DIST):
        print(f"ERROR: missing dist at {LOCAL_DIST}")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    print("=== 1) M1 当前静态目录 ===")
    run(client, f"ls -lah {REMOTE_ADMIN} | head -20")
    run(client, f"ls -lah {REMOTE_ADMIN}/assets 2>/dev/null | grep MainLayout || true")
    run(client, "curl -s http://127.0.0.1:3100/admin/ | head -20")
    run(client, "grep -R \"express.static\" -n server.js 2>/dev/null || grep -R \"public/admin\" -n server.js")
    run(client, "pm2 show cnber-backend 2>/dev/null | head -25 || true")

    print("\n=== 2) 清空旧 public/admin ===")
    run(client, f"rm -rf {REMOTE_ADMIN}/*")
    run(client, f"mkdir -p {REMOTE_ADMIN}/assets")

    print("\n=== 3) 上传新版 dist ===")
    sftp = client.open_sftp()
    count = 0
    for root, _, files in os.walk(LOCAL_DIST):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, LOCAL_DIST).replace("\\", "/")
            remote_path = f"{REMOTE_ADMIN}/{rel}"
            put_lf(sftp, local_path, remote_path)
            count += 1
            print(f"upload {rel}")
    sftp.close()
    print(f"uploaded {count} files")

    print("\n=== 4) pm2 restart ===")
    run(client, f"cd {REMOTE_ROOT} && pm2 restart cnber-backend --update-env")
    run(client, "sleep 2")
    run(client, "pm2 logs cnber-backend --lines 20 --nostream")

    print("\n=== 5) HTTP / grep 验证 ===")
    run(client, "curl -s http://127.0.0.1:3100/admin/ | head -20")
    run(client, "curl -s http://127.0.0.1:3100/admin/ | grep -o 'assets/[^\"']*\\.js' | head")
    run(client, f"find {REMOTE_ADMIN}/assets -name 'MainLayout-*.js' -ls")
    run(client, f"grep -R 'cnber_admin_sidebar_groups' {REMOTE_ADMIN}/assets | head -3")
    run(client, f"grep -R '#8fa3bd' {REMOTE_ADMIN}/assets | head -3")
    run(client, f"grep -R '菜单 V2' {REMOTE_ADMIN}/assets {REMOTE_ADMIN}/index.html | head -5")

    client.close()
    print("\nDONE — browser: http://192.168.1.187:3100/admin/?v=sidebar-v2 (Ctrl+Shift+R)")


if __name__ == "__main__":
    main()
