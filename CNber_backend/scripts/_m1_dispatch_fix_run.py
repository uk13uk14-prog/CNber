#!/usr/bin/env python3
"""Diagnose, deploy dispatch fix, rebuild admin, verify API assign on M1."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(c, cmd, timeout=300):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=timeout,
    )
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    return o.channel.recv_exit_status(), out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    print("===== PRE: assign test =====")
    code, out, err = run(c, f"cd {ROOT}/CNber_backend && node scripts/_m1_assign_test.js")
    print(out)
    if err.strip():
        print("stderr:", err[:500])

    print("===== PRE: bundle grep =====")
    for pat in ["recommendedDriversForOrder", "extractDriverRows", "selectableDriversForOrder"]:
        _, out, _ = run(
            c,
            f"grep -c '{pat}' {ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue 2>/dev/null || echo 0",
        )
        print(f"source {pat}:", out.strip())

    # Upload fixed files
    sftp = c.open_sftp()
    uploads = [
        (
            os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/src/views/OrdersView.vue"),
            f"{ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue",
        ),
        (
            os.path.join(LOCAL_ROOT, "CNber_backend/controllers/adminController.js"),
            f"{ROOT}/CNber_backend/controllers/adminController.js",
        ),
        (
            os.path.join(LOCAL_ROOT, "CNber_backend/scripts/_m1_assign_test.js"),
            f"{ROOT}/CNber_backend/scripts/_m1_assign_test.js",
        ),
    ]
    for local, remote in uploads:
        put_lf(sftp, local, remote)
        print("Uploaded", os.path.basename(local))
    sftp.close()

    steps = [
        f"cd {ROOT}/CNber_admin_web_v1.0 && npm install && npm run build",
        f"mkdir -p {ROOT}/CNber_backend/public/admin && rm -rf {ROOT}/CNber_backend/public/admin/*",
        f"cp -R {ROOT}/CNber_admin_web_v1.0/dist/* {ROOT}/CNber_backend/public/admin/",
        f"test -f {ROOT}/CNber_backend/public/admin/index.html",
        f"cd {ROOT}/CNber_backend && pm2 restart cnber-backend --update-env && pm2 save && sleep 2",
    ]
    for step in steps:
        print(f"\n>>> {step}")
        code, out, err = run(c, step, timeout=600)
        if out.strip():
            print(out[-4000:] if len(out) > 4000 else out)
        if code != 0:
            print("FAILED:", err[-2000:])
            c.close()
            sys.exit(code)

    print("\n===== POST: source patterns =====")
    for pat in ["extractDriverRows", "selectableDriversForOrder", "OrdersView] availableDrivers"]:
        _, out, _ = run(
            c,
            f"grep -c '{pat}' {ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue 2>/dev/null || echo 0",
        )
        print(pat, out.strip())

    print("\n===== POST: API available =====")
    login_body = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, login_out, _ = run(
        c,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_body}'",
    )
    tok = json.loads(login_out)["data"]["token"]
    _, body, _ = run(
        c,
        f"curl -s 'http://127.0.0.1:3100/api/admin/drivers/available' "
        f"-H 'Authorization: Bearer {tok}'",
    )
    print(body[:2000])

    print("\n===== POST: assign test =====")
    _, out, _ = run(c, f"cd {ROOT}/CNber_backend && node scripts/_m1_assign_test.js")
    print(out)

    print("\n===== POST: driver orders =====")
    driver_login = json.dumps({"phone": "13900000001", "password": "123456"})
    _, dlogin, _ = run(
        c,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{driver_login}'",
    )
    dtok = json.loads(dlogin).get("data", {}).get("token", "")
    if dtok:
        _, dout, _ = run(
            c,
            f"curl -s 'http://127.0.0.1:3100/api/driver/orders' "
            f"-H 'Authorization: Bearer {dtok}'",
        )
        print(dout[:3000])
    else:
        print("driver login failed:", dlogin[:500])

    _, out, _ = run(c, "pm2 list")
    print("\n===== PM2 =====")
    print(out)

    c.close()


if __name__ == "__main__":
    main()
