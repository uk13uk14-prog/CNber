#!/usr/bin/env python3
import os, paramiko
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL = os.path.join(os.path.dirname(__file__), "fix_ready_to_start_without_driver_dryrun.js")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
with open(LOCAL, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/CNber_backend/scripts/fix_ready_to_start_without_driver_dryrun.js", "wb") as rf:
    rf.write(data)
sftp.close()
_, o, e = c.exec_command(
    f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT}/CNber_backend && node scripts/fix_ready_to_start_without_driver_dryrun.js",
    timeout=60,
)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip():
    print("STDERR:", err)
c.close()
