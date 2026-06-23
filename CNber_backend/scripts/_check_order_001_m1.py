#!/usr/bin/env python3
import json
import os
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL = os.path.join(os.path.dirname(__file__), "_check_order_001.js")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
with open(LOCAL, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/scripts/_check_order_001.js", "wb") as rf:
    rf.write(data)
sftp.close()

def run(cmd):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=60
    )
    return o.read().decode("utf-8", errors="replace"), e.read().decode("utf-8", errors="replace")

print("=== ORDER ===")
out, _ = run(f"cd {ROOT} && node scripts/_check_order_001.js")
print(out)

login_body = json.dumps({"phone": "13800000000", "password": "Admin123456"})
lo, _ = run(
    f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
    f"-H 'Content-Type: application/json' -d '{login_body}'"
)
tok = json.loads(lo)["data"]["token"]

for stage in ["deposit", "pending"]:
    pr, _ = run(
        f"curl -s 'http://127.0.0.1:3100/api/admin/payment-reviews?stage={stage}&page=1&pageSize=50' "
        f"-H 'Authorization: Bearer {tok}'"
    )
    parsed = json.loads(pr)
    items = parsed.get("data", {}).get("items") or []
    hit = [x for x in items if x.get("orderNo") == "CNB-20260622-001"]
    print(f"=== payment-reviews stage={stage} total={len(items)} found_001={len(hit)} ===")
    if hit:
        print(json.dumps(hit[0], ensure_ascii=False, indent=2))

c.close()
