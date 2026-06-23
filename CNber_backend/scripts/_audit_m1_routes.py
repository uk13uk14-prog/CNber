#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

checks = [
    f"grep -n 'finance\\|payment-reviews\\|onboarding' {REMOTE}/routes/admin.js || echo NO_MATCH",
    f"grep -c 'router.get' {REMOTE}/routes/admin.js",
    f"test -f {REMOTE}/controllers/p0OperationsController.js && echo p0_ok || echo p0_missing",
    f"test -f {REMOTE}/controllers/driverOnboardingController.js && echo onboard_ok || echo onboard_missing",
    f"test -f {REMOTE}/controllers/financeController.js && echo finance_ok || echo finance_missing",
    "curl -s -o /dev/null -w 'finance_summary:%{http_code}\\n' http://127.0.0.1:3100/api/admin/finance/summary",
    "curl -s -o /dev/null -w 'finance_recon:%{http_code}\\n' http://127.0.0.1:3100/api/admin/finance/reconciliation",
    "curl -s -o /dev/null -w 'payment_reviews:%{http_code}\\n' http://127.0.0.1:3100/api/admin/payment-reviews",
    "curl -s -o /dev/null -w 'driver_onboarding:%{http_code}\\n' http://127.0.0.1:3100/api/admin/drivers/onboarding",
]

for cmd in checks:
    _, stdout, _ = client.exec_command(cmd)
    print(f"=== {cmd[:70]} ===")
    print(stdout.read().decode("utf-8", errors="replace"))

client.close()
