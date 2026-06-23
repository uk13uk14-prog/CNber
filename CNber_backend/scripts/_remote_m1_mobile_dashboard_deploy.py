#!/usr/bin/env python3
"""Deploy mobile dashboard API to M1 and run HTTP smoke tests."""
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

FILES = [
    ("controllers/adminController.js", "controllers/adminController.js"),
    ("routes/admin.js", "routes/admin.js"),
]

VERIFY_SH = r"""#!/bin/bash
set -e
BASE="http://127.0.0.1:3100/api"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"phone":"13800000000","password":"Admin123456"}')
echo "LOGIN:$LOGIN"
TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['data']['token'])" "$LOGIN")
ROLE=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['data']['user']['role'])" "$LOGIN")
echo "ROLE:$ROLE"
for path in \
  "/admin/mobile/dashboard" \
  "/admin/orders?range=14d&page=1&pageSize=100" \
  "/admin/support-tickets?page=1&pageSize=20" \
  "/admin/me/permissions"
do
  echo "--- GET $path ---"
  curl -s -w "\nHTTP_STATUS:%{http_code}\n" -H "Authorization: Bearer $TOKEN" "$BASE$path"
  echo
done
"""


def run(client, cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    with SCPClient(client.get_transport()) as scp:
        for local_rel, remote_rel in FILES:
            local_path = os.path.join(LOCAL_BACKEND, local_rel.replace("/", os.sep))
            remote_path = f"{REMOTE_BASE}/{remote_rel}"
            print(f"Upload {local_rel} -> {remote_path}")
            scp.put(local_path, remote_path)

        verify_path = f"{REMOTE_BASE}/scripts/_m1_mobile_verify.sh"
        local_verify = os.path.join(os.path.dirname(__file__), "_m1_mobile_verify.sh")
        with open(local_verify, "w", encoding="utf-8", newline="\n") as f:
            f.write(VERIFY_SH)
        scp.put(local_verify, verify_path)

    deploy_cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        f"cd {REMOTE_BASE} && npm install && "
        "chmod +x scripts/_m1_mobile_verify.sh && "
        "pm2 restart cnber-backend --update-env && "
        "sleep 3 && pm2 status cnber-backend && "
        "echo '--- PM2 LOGS ---' && pm2 logs cnber-backend --lines 80 --nostream && "
        "echo '--- HTTP VERIFY ---' && bash scripts/_m1_mobile_verify.sh"
    )
    print("\n--- Deploy + Verify ---\n")
    code, out, err = run(client, deploy_cmd, timeout=300)
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    if err.strip():
        sys.stdout.buffer.write(b"\n--- STDERR ---\n")
        sys.stdout.buffer.write(err.encode("utf-8", errors="replace"))

    log_path = os.path.join(os.path.dirname(__file__), "_m1_mobile_deploy_last.log")
    with open(log_path, "w", encoding="utf-8") as lf:
        lf.write(out)
        if err.strip():
            lf.write("\n--- STDERR ---\n")
            lf.write(err)

    client.close()
    print(f"\nLog written: {log_path}")
    print(f"Exit code: {code}")
    sys.exit(code)


if __name__ == "__main__":
    main()
