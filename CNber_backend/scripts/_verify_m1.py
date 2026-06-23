#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

checks = [
    'curl -s -o /dev/null -w "admin HTTP %{http_code}\\n" http://192.168.1.187:3100/admin/',
    'curl -s -o /dev/null -w "wechat_qr HTTP %{http_code}\\n" http://192.168.1.187:3100/uploads/payment-accounts/wechat-qr.jpg',
    'curl -s -o /dev/null -w "alipay_qr HTTP %{http_code}\\n" http://192.168.1.187:3100/uploads/payment-accounts/alipay-qr.jpg',
    'grep -oh "支付[^\\"]*" CNber_backend/public/admin/assets/MainLayout-*.js | sort -u',
    'export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; pm2 list | grep cnber',
]

for cmd in checks:
    full = f"cd {REMOTE} && {cmd}"
    _, stdout, stderr = client.exec_command(full)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"=== {cmd[:60]} ===")
    print(out or err or "(empty)")

client.close()
