#!/usr/bin/env python3
import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
cmds = [
    "grep -h '6a3867c8\\|6a3869a1\\|6a386d816' ~/.pm2/logs/cnber-backend-out.log 2>/dev/null | grep -E 'POST|PATCH|PUT' | tail -40",
    "grep -h '状态变化' ~/.pm2/logs/cnber-backend-out.log 2>/dev/null | tail -30",
    "grep -h '/order/pay\\|pay-remaining' ~/.pm2/logs/cnber-backend-out.log 2>/dev/null | tail -30",
]
for cmd in cmds:
    print(">>>", cmd[:60])
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode("utf-8", errors="replace"))
c.close()
