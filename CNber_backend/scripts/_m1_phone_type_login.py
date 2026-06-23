#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212")

def run(body):
    _, o, _ = c.exec_command(
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        f"-d '{body}'"
    )
    return o.read().decode("utf-8", "replace").strip()

print("string phone:", run('{"phone":"13900000001","password":"123456"}'))
print("number phone:", run('{"phone":13900000001,"password":"123456"}'))
c.close()
