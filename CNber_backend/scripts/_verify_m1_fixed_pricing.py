#!/usr/bin/env python3
import json
import sys
import time
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212", timeout=30)
time.sleep(2)

def run(cmd):
    _, o, e = c.exec_command(cmd)
    return o.read().decode("utf-8", errors="replace")

login = json.loads(
    run(
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}'"
    )
)
tok = login["data"]["token"]
fixed = run(
    f"curl -s http://127.0.0.1:3100/api/admin/pricing/fixed -H 'Authorization: Bearer {tok}'"
)
print("fixed pricing API:", fixed[:900])
run(
    "curl -s -X PUT http://127.0.0.1:3100/api/admin/settings/exchange-rate "
    f"-H 'Authorization: Bearer {tok}' -H 'Content-Type: application/json' -d '{{\"rate\":9}}'"
)
fixed2 = json.loads(
    run(
        f"curl -s http://127.0.0.1:3100/api/admin/pricing/fixed -H 'Authorization: Bearer {tok}'"
    )
)
point = next((r for r in fixed2["data"]["rules"] if r["serviceType"] == "point"), None)
print("point @ rate 9:", point)
c.close()
