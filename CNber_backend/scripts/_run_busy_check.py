#!/usr/bin/env python3
import os, paramiko
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL = os.path.join(os.path.dirname(__file__), "_m1_busy_driver_check.js")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
with open(LOCAL, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/CNber_backend/scripts/_m1_busy_driver_check.js", "wb") as rf:
    rf.write(data)
sftp.close()
_, o, e = c.exec_command(
    f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT}/CNber_backend && node scripts/_m1_busy_driver_check.js",
    timeout=60,
)
print(o.read().decode("utf-8", errors="replace"))
js = f"{ROOT}/CNber_backend/public/admin/assets/OrdersView-B2ROakjY.js"
_, o2, _ = c.exec_command(
    f"node -e \"const fs=require('fs');const s=fs.readFileSync('{js}','utf8');"
    f"['idle','approved','depositPaid','ready_to_start','paymentStatus','depositStatus'].forEach(k=>console.log(k, s.includes(k)));\"",
    timeout=30,
)
print("bundle strings:", o2.read().decode())
c.close()
