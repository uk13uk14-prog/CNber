#!/usr/bin/env python3
"""Deploy OrdersView confirm-deposit button to M1."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL_ADMIN = os.path.abspath(
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
    put_lf(
        sftp,
        os.path.join(LOCAL_ADMIN, "src/views/OrdersView.vue"),
        f"{ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue",
    )
    sftp.close()
    print("uploaded OrdersView.vue")

    steps = [
        f"cd {ROOT}/CNber_admin_web_v1.0 && npm run build",
        f"mkdir -p {ROOT}/CNber_backend/public/admin && rm -rf {ROOT}/CNber_backend/public/admin/*",
        f"cp -R {ROOT}/CNber_admin_web_v1.0/dist/* {ROOT}/CNber_backend/public/admin/",
        f"test -f {ROOT}/CNber_backend/public/admin/index.html",
    ]
    for step in steps:
        print(f"\n>>> {step}")
        code, out, err = run(c, step, timeout=300)
        if out.strip():
            print(out[-3000:] if len(out) > 3000 else out)
        if err.strip():
            print(err[-800:])
        if code != 0:
            c.close()
            sys.exit(code)

    _, out, _ = run(
        c,
        f"grep -o '确认定金' {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js | head -1",
    )
    print("\n确认定金 in bundle:", out.strip() or "NOT FOUND")

    _, out, _ = run(c, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/admin/")
    print("/admin HTTP", out.strip())
    c.close()


if __name__ == "__main__":
    main()
