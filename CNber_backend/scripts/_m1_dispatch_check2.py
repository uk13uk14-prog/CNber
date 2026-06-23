#!/usr/bin/env python3
import json
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.187", username="agent001", password="121212")


def run(cmd):
    _, o, _ = c.exec_command(
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; " + cmd
    )
    return o.read().decode("utf-8", errors="replace").strip()


login = json.loads(
    run(
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}'"
    )
)
tok = login["data"]["token"]

print("=== M1 source isDriverAvailable ===")
print(
    run(
        "grep -A4 'function isDriverAvailable' "
        "/Users/agent001/Desktop/CNber/CNber_admin_web_v1.0/src/views/OrdersView.vue"
    )
)

print("\n=== deployed bundle online check ===")
print(
    run(
        "grep -o 'online.*approved' "
        "/Users/agent001/Desktop/CNber/CNber_backend/public/admin/assets/OrdersView*.js | head -3"
    )
)

print("\n=== pending_dispatch orders sample ===")
orders = json.loads(
    run(
        f"curl -s 'http://127.0.0.1:3100/api/admin/orders?page=1&pageSize=10&quick=pending_dispatch' "
        f"-H 'Authorization: Bearer {tok}'"
    )
)
rows = orders.get("data", {}).get("orders") or []
print("count=", len(rows))
for o in rows[:5]:
    print(
        json.dumps(
            {
                "id": str(o.get("_id", ""))[:8],
                "status": o.get("status"),
                "depositStatus": o.get("depositStatus"),
                "depositPaid": o.get("depositPaid"),
                "dispatchStatus": o.get("dispatchStatus"),
                "paymentStage": o.get("paymentStage"),
            },
            ensure_ascii=False,
        )
    )

c.close()
