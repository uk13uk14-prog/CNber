#!/usr/bin/env python3
"""Deploy transactionRef payment flow to M1 (backend + admin rebuild)."""
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

SYNC_FILES = [
    ("CNber_backend/models/Order.js", "CNber_backend/models/Order.js"),
    ("CNber_backend/controllers/orderPaymentController.js", "CNber_backend/controllers/orderPaymentController.js"),
    ("CNber_backend/utils/enrichOrderPayments.js", "CNber_backend/utils/enrichOrderPayments.js"),
    (
        "CNber_admin_web_v1.0/src/utils/serviceType.js",
        "CNber_admin_web_v1.0/src/utils/serviceType.js",
    ),
    (
        "CNber_admin_web_v1.0/src/views/PaymentReviewCenterView.vue",
        "CNber_admin_web_v1.0/src/views/PaymentReviewCenterView.vue",
    ),
    (
        "CNber_admin_web_v1.0/src/views/OrderDetailView.vue",
        "CNber_admin_web_v1.0/src/views/OrderDetailView.vue",
    ),
]


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    print("Uploading files...")
    for rel_local, rel_remote in SYNC_FILES:
        lp = os.path.join(LOCAL_ROOT, rel_local.replace("/", os.sep))
        rp = f"{REMOTE}/{rel_remote}"
        put_lf(sftp, lp, rp)
        print(f"  {rel_remote}")
    sftp.close()

    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        f"cd {REMOTE}/CNber_admin_web_v1.0 && npm run build && "
        f"rm -rf {REMOTE}/CNber_backend/public/admin/* && "
        f"cp -R {REMOTE}/CNber_admin_web_v1.0/dist/* {REMOTE}/CNber_backend/public/admin/ && "
        f"cd {REMOTE}/CNber_backend && pm2 restart cnber-backend --update-env && sleep 2 && "
        "pm2 list | grep cnber"
    )
    print("\nBuilding admin + restarting pm2...")
    _, stdout, stderr = client.exec_command(cmd, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out[-3000:] if len(out) > 3000 else out)
    if err.strip():
        print("STDERR:", err[-1500:])
    client.close()
    print("\nM1 deploy done.")


if __name__ == "__main__":
    main()
