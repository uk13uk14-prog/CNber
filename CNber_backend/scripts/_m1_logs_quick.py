#!/usr/bin/env python3
import sys
import paramiko
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212")
_, o, _ = c.exec_command("export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; pm2 list; pm2 logs cnber-backend --lines 50 --nostream 2>&1")
print(o.read().decode("utf-8", errors="replace"))
_, o, _ = c.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/api/health || curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/")
print("HTTP", o.read().decode())
c.close()
