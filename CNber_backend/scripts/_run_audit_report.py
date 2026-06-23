#!/usr/bin/env python3
import os, paramiko
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL = os.path.join(os.path.dirname(__file__), "_m1_audit_report.js")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
with open(LOCAL, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/CNber_backend/scripts/_m1_audit_report.js", "wb") as rf:
    rf.write(data)
sftp.close()
_, o, e = c.exec_command(
    f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT}/CNber_backend && node scripts/_m1_audit_report.js",
    timeout=120,
)
print(o.read().decode("utf-8", errors="replace"))
_, o2, _ = c.exec_command(
    f"ls -la {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js 2>/dev/null; "
    f"stat -f '%Sm' {ROOT}/CNber_backend/public/admin/index.html 2>/dev/null",
    timeout=30,
)
print("===DEPLOY===", o2.read().decode())
c.close()
