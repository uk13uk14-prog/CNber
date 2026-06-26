#!/usr/bin/env python3
"""Full backend code sync to M1 + operations dashboard deploy."""
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
REMOTE_BACKEND = f"{ROOT}/CNber_backend"
REMOTE_ADMIN = f"{REMOTE_BACKEND}/public/admin"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LOCAL_BACKEND = os.path.join(LOCAL_ROOT, "CNber_backend")
LOCAL_DIST = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/dist")

SYNC_DIRS = ["controllers", "models", "routes", "middlewares", "utils", "services"]
SKIP_DIR_NAMES = {"node_modules", ".git", "uploads"}


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
    count = 0
    for root, dirs, files in os.walk(local_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIR_NAMES]
        for name in files:
            if name.endswith(".map"):
                continue
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, local_dir).replace("\\", "/")
            put_lf(sftp, local_path, f"{remote_dir}/{rel}")
            count += 1
    return count


def run(c, cmd, timeout=120):
    print(f"\n$ {cmd[:200]}")
    _, stdout, stderr = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    text = (out + err).rstrip()
    if text:
        print(text)
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: npm run build first")
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()

    print("\n=== sync backend code dirs ===")
    total = 0
    for d in SYNC_DIRS:
        local = os.path.join(LOCAL_BACKEND, d)
        if not os.path.isdir(local):
            continue
        n = upload_tree(sftp, local, f"{REMOTE_BACKEND}/{d}")
        print(f"  {d}/ -> {n} files")
        total += n
    put_lf(sftp, os.path.join(LOCAL_BACKEND, "server.js"), f"{REMOTE_BACKEND}/server.js")
    print(f"  server.js")
    total += 1

    print("\n=== upload admin dist ===")
    run(c, f"rm -rf {REMOTE_ADMIN}/*")
    n = upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)
    print(f"  dist -> {n} files")

    sftp.close()

    print("\n=== restart + smoke ===")
    run(c, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env")
    time.sleep(6)

    status = run(c, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/api/status")
    code = status.strip()[-3:] if status.strip() else "000"
    print(f"api/status -> {code}")

    if code != "200":
        run(c, "pm2 logs cnber-backend --lines 30 --nostream 2>&1 | tail -35")
        c.close()
        sys.exit(1)

    run(c, "curl -s -o /dev/null -w 'admin %{http_code}\\n' http://127.0.0.1:3100/admin/")
    run(
        c,
        f"grep -rl '运营驾驶舱' {REMOTE_ADMIN}/assets/*.js 2>/dev/null | head -1",
    )

    # login + overview API
    login_cmd = (
        "TOKEN=$(curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}' "
        "| python3 -c \"import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))\") && "
        "curl -s -H \"Authorization: Bearer $TOKEN\" http://127.0.0.1:3100/api/admin/dashboard/overview "
        "| python3 -c \"import sys,json; d=json.load(sys.stdin); print('overview code', d.get('code')); "
        "print('online total', d.get('data',{}).get('onlineUsers',{}).get('total'))\""
    )
    run(c, login_cmd, timeout=60)

    c.close()
    print("\nDONE — M1 full sync + operations dashboard live")
    print("http://192.168.1.187:3100/admin/operations-dashboard")


if __name__ == "__main__":
    main()
