#!/usr/bin/env python3
"""Deploy profile feature to M1: admin dist + backend files + backfill + verify."""
import json
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
LOCAL_DIST = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/dist")
LOCAL_BACKEND = os.path.join(LOCAL_ROOT, "CNber_backend")

BACKEND_FILES = [
    "models/CustomerProfile.js",
    "models/DriverProfile.js",
    "models/AIProfileInsight.js",
    "utils/profileSync.js",
    "utils/aiProfileInsightEngine.js",
    "controllers/profileController.js",
    "routes/admin.js",
    "controllers/adminController.js",
    "controllers/orderController.js",
    "controllers/p0OperationsController.js",
    "scripts/backfill_profiles_from_orders.js",
    "scripts/smoke_profiles.js",
]

ADMIN_SRC_FILES = [
    "src/layouts/MainLayout.vue",
    "src/router/index.js",
    "src/api/admin.js",
    "src/views/CustomerProfilesView.vue",
    "src/views/DriverProfilesView.vue",
]


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


def run(client, cmd, timeout=120):
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print("STDERR:", err.rstrip(), file=sys.stderr)
    return code, out, err


def upload_tree(sftp, local_dir, remote_dir):
    count = 0
    for root, _, files in os.walk(local_dir):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, local_dir).replace("\\", "/")
            remote_path = f"{remote_dir}/{rel}"
            put_lf(sftp, local_path, remote_path)
            count += 1
            print(f"upload dist/{rel}")
    return count


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: run npm run build in CNber_admin_web_v1.0 first")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    print("===== upload admin dist =====")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)

    print("\n===== upload backend profile files =====")
    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"upload backend/{rel}")

    print("\n===== upload admin source (M1 rebuild fallback) =====")
    for rel in ADMIN_SRC_FILES:
        local_path = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep))
        remote_path = f"{ROOT}/CNber_admin_web_v1.0/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"upload admin/{rel}")

    sftp.close()

    run(
        client,
        f"grep -R '生成AI分析' {REMOTE_ADMIN}/assets 2>/dev/null | head -3 || true",
    )
    run(
        client,
        f"grep -R 'AI 洞察' {REMOTE_ADMIN}/assets 2>/dev/null | head -3 || true",
    )

    print("\n===== restart backend =====")
    run(
        client,
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env",
    )
    time.sleep(3)

    print("\n===== profile API smoke =====")
    _, login_out, _ = run(
        client,
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"admin\",\"password\":\"admin123\"}'",
    )
    token = ""
    try:
        token = json.loads(login_out.strip().split("\n")[-1]).get("data", {}).get("token", "")
    except Exception:
        pass
    if not token:
        run(
            client,
            "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
            "-H 'Content-Type: application/json' "
            "-d '{\"phone\":\"13900000001\",\"password\":\"123456\"}'",
        )

    for path in ["/api/admin/profiles/customers", "/api/admin/profiles/drivers"]:
        if token:
            run(
                client,
                f"curl -s 'http://127.0.0.1:3100{path}?page=1&pageSize=3' "
                f"-H 'Authorization: Bearer {token}' | head -c 500",
            )
        else:
            run(client, f"curl -s -o /dev/null -w '%{{http_code}}' 'http://127.0.0.1:3100{path}'")

    print("\n===== backfill profiles =====")
    run(
        client,
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && node scripts/backfill_profiles_from_orders.js",
        timeout=300,
    )

    print("\n===== mongo counts =====")
    run(
        client,
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && node -e \""
        "require('dotenv').config();"
        "const m=require('mongoose');"
        "const C=require('./models/CustomerProfile');"
        "const D=require('./models/DriverProfile');"
        "const I=require('./models/AIProfileInsight');"
        "(async()=>{await m.connect(process.env.MONGO_URI||process.env.MONGODB_URI);"
        "const c=await C.countDocuments();"
        "const d=await D.countDocuments();"
        "const i=await I.countDocuments();"
        "console.log(JSON.stringify({customerProfiles:c,driverProfiles:d,aiInsights:i}));"
        "await m.disconnect();})().catch(e=>{console.error(e);process.exit(1);});"
        "\"",
        timeout=60,
    )

    print("\n===== AI insight API smoke =====")
    if token:
        for kind, api_path in [
            ("customer", "/api/admin/profiles/customers"),
            ("driver", "/api/admin/profiles/drivers"),
        ]:
            run(
                client,
                f"PROFILE_ID=$(curl -s 'http://127.0.0.1:3100{api_path}?page=1&pageSize=1' "
                f"-H 'Authorization: Bearer {token}' | "
                f"python3 -c \"import sys,json; r=json.load(sys.stdin).get('data',{{}}).get('rows',[]); print(r[0]['_id'] if r else '')\") && "
                f"if [ -n \\\"$PROFILE_ID\\\" ]; then "
                f"echo '=== {kind} ai-summary ===' && "
                f"curl -s -X POST 'http://127.0.0.1:3100{api_path}/'$PROFILE_ID'/ai-summary' "
                f"-H 'Authorization: Bearer {token}' -H 'Content-Type: application/json' | head -c 1000; "
                f"echo; else echo 'no {kind} profile'; fi",
            )

    print("\n===== admin HTTP =====")
    run(client, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")

    client.close()
    print("\nDONE — hard refresh M1 /admin (Ctrl+Shift+R)")


if __name__ == "__main__":
    main()
