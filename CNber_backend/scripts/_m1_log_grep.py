#!/usr/bin/env python3
import paramiko
ROOT = "/Users/agent001/Desktop/CNber"
IDS = ["6a386d81689c2db9fa688556", "6a3869a1ff7e2e618b7f39ab", "6a3867c8ff7e2e618b7f3996"]
NOS = ["CNB-20260622-001", "CNB-20260621-008", "CNB-20260621-007"]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
patterns = IDS + NOS + ["ready_to_start", "payOrder", "/order/pay", "pay-remaining"]
for p in patterns[:6]:
    _, o, _ = c.exec_command(
        f"grep -h '{p}' ~/.pm2/logs/cnber-backend-out.log 2>/dev/null | tail -5",
        timeout=30,
    )
    lines = o.read().decode("utf-8", errors="replace").strip()
    if lines:
        print(f"--- log match {p} ---")
        print(lines)
_, o, _ = c.exec_command(
    f"grep -h 'ready_to_start' ~/.pm2/logs/cnber-backend-out.log 2>/dev/null | tail -20",
    timeout=30,
)
print("--- recent ready_to_start logs ---")
print(o.read().decode("utf-8", errors="replace"))
c.close()
