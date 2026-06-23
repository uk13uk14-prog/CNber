#!/usr/bin/env python3
"""Deploy OrdersView fix to M1, rebuild admin, verify dispatch."""
import json
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0")
)


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(c, cmd, timeout=300):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=timeout
    )
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    return o.channel.recv_exit_status(), out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = c.open_sftp()
    remote_vue = f"{ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue"
    put_lf(sftp, os.path.join(LOCAL_DIR, "src/views/OrdersView.vue"), remote_vue)
    sftp.close()
    print("Uploaded OrdersView.vue")

    steps = [
        f"cd {ROOT}/CNber_admin_web_v1.0 && npm run build",
        f"mkdir -p {ROOT}/CNber_backend/public/admin && rm -rf {ROOT}/CNber_backend/public/admin/*",
        f"cp -R {ROOT}/CNber_admin_web_v1.0/dist/* {ROOT}/CNber_backend/public/admin/",
        f"test -f {ROOT}/CNber_backend/public/admin/index.html",
        f"cd {ROOT}/CNber_backend && pm2 restart cnber-backend --update-env && sleep 2",
    ]
    for step in steps:
        print(f"\n>>> {step}")
        code, out, err = run(c, step, timeout=300)
        if out.strip():
            print(out[-3000:] if len(out) > 3000 else out)
        if err.strip() and code != 0:
            print("ERR:", err[-1000:])
        if code != 0:
            c.close()
            sys.exit(code)

    _, out, _ = run(
        c,
        f"grep -o \"online.*approved\" {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js | head -2",
    )
    print("\n=== bundle isDriverAvailable snippet ===")
    print(out or "(pattern not found - check minified bundle)")

    _, out, _ = run(
        c,
        f"grep -o \"normalizeDriverForSelect\" {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js | head -1",
    )
    print("normalizeDriverForSelect in bundle:", out or "minified away (ok if build ok)")

    # assign test
    code, out, err = run(c, f"cd {ROOT}/CNber_backend && node scripts/_m1_assign_test.js")
    print("\n=== assign test ===")
    print(out)
    if err.strip():
        print(err)

    _, out, _ = run(c, "curl -s -o /dev/null -w '%{http_code}' http://192.168.1.187:3100/admin/")
    print("\n/admin HTTP", out)

    c.close()


if __name__ == "__main__":
    main()
