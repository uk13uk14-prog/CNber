#!/usr/bin/env python3
import time
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
time.sleep(5)

cmds = [
    "curl -s -o /dev/null -w 'status %{http_code}\\n' http://127.0.0.1:3100/api/status",
    "curl -s -o /dev/null -w 'admin %{http_code}\\n' http://127.0.0.1:3100/admin/",
    "curl -s http://127.0.0.1:3100/api/status",
    "pm2 logs cnber-backend --lines 20 --nostream 2>&1 | tail -25",
]

for cmd in cmds:
    print(f"\n$ {cmd}")
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=30,
    )
    print(stdout.read().decode("utf-8", "replace").rstrip())

c.close()
