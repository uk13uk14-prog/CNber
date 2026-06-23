#!/usr/bin/env python3
import os
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL = os.path.join(os.path.dirname(__file__), "_m1_full_dispatch_audit.js")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
with open(LOCAL, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/CNber_backend/scripts/_m1_full_dispatch_audit.js", "wb") as rf:
    rf.write(data)
sftp.close()
_, o, e = c.exec_command(
    f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT}/CNber_backend && node scripts/_m1_full_dispatch_audit.js",
    timeout=120,
)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip():
    print("STDERR:", err)
# also check deployed bundle vs source
_, o2, _ = c.exec_command(
    f"grep -c 'selectableDriversForOrder\\|extractDriverRows\\|OrdersView] availableDrivers' {ROOT}/CNber_admin_web_v1.0/src/views/OrdersView.vue; "
    f"grep -l 'selectableDriversForOrder' {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js 2>/dev/null | head -1; "
    f"ls -la {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js 2>/dev/null",
    timeout=30,
)
print("\n===== bundle vs source =====")
print(o2.read().decode("utf-8", errors="replace"))
c.close()
