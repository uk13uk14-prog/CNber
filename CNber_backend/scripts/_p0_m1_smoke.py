#!/usr/bin/env python3
"""P0 admin page API smoke test on M1."""
import json
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
BASE = "http://127.0.0.1:3100"
LOGIN = {"phone": "13800000000", "password": "Admin123456"}

# page -> list of (method, path, query_suffix)
PAGE_APIS = {
    "工作台": [("GET", "/api/admin/dashboard", "")],
    "订单": [("GET", "/api/admin/orders", "?page=1&pageSize=10")],
    "司机管理": [("GET", "/api/admin/drivers", "?page=1&pageSize=10")],
    "司机审核": [("GET", "/api/admin/drivers/onboarding", "?page=1&pageSize=10")],
    "客户管理": [("GET", "/api/admin/customers", "?page=1&pageSize=10")],
    "支付设置": [("GET", "/api/admin/payment-accounts", "")],
    "支付审核": [("GET", "/api/admin/payment-reviews", "?stage=pending&page=1&pageSize=10")],
    "财务对账": [
        ("GET", "/api/admin/finance/summary", ""),
        ("GET", "/api/admin/finance/transactions", "?page=1&pageSize=10"),
        ("GET", "/api/admin/finance/driver-settlements", "?page=1&pageSize=10"),
        ("GET", "/api/admin/finance/reconciliation", "?page=1&pageSize=10"),
    ],
    "报价设置": [("GET", "/api/admin/pricing-rules", "")],
}


def run(client, cmd):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}"
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def curl_json(client, method, path, token=None, body=None):
    headers = "-H 'Content-Type: application/json'"
    if token:
        headers += f" -H 'Authorization: Bearer {token}'"
    data = ""
    if body is not None:
        payload = json.dumps(body).replace("'", "'\\''")
        data = f"-d '{payload}'"
    cmd = (
        f"curl -s -w '\\n__HTTP__%{{http_code}}' -X {method} "
        f"{BASE}{path} {headers} {data}"
    )
    _, out, _ = run(client, cmd)
    if "__HTTP__" not in out:
        return 0, out.strip(), {}
    body_text, http = out.rsplit("__HTTP__", 1)
    http = http.strip()
    try:
        parsed = json.loads(body_text)
    except json.JSONDecodeError:
        parsed = {"raw": body_text[:200]}
    return int(http), http, parsed


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    print("=== LOGIN ===")
    http, _, login = curl_json(client, "POST", "/api/auth/login", body=LOGIN)
    if http != 200 or login.get("code") != 0:
        print("LOGIN FAILED", login)
        sys.exit(1)
    token = login["data"]["token"]
    print("OK")

    print("\n=== ADMIN PAGES ===")
    page_results = {}
    for page, apis in PAGE_APIS.items():
        ok = True
        failures = []
        for method, path, qs in apis:
            full = path + qs
            http, _, body = curl_json(client, method, full, token=token)
            if http != 200 or body.get("code") not in (0, None):
                ok = False
                msg = body.get("message", body.get("raw", str(body)[:80]))
                failures.append(f"{method} {full} -> HTTP {http} ({msg})")
        page_results[page] = (ok, failures)
        status = "OK" if ok else "FAIL"
        print(f"  [{status}] {page}")
        for f in failures:
            print(f"       {f}")

    print("\n=== PAYMENT ACCOUNTS (public) ===")
    http, _, body = curl_json(client, "GET", "/api/payment/accounts")
    accounts = body.get("data", {}).get("accounts", []) if body.get("code") == 0 else []
    methods = {a.get("method") or a.get("paymentType") for a in accounts}
    print(f"  HTTP {http}, count={len(accounts)}, methods={methods}")
    for a in accounts:
        method = a.get("method") or a.get("paymentType")
        enabled = a.get("enabled", True)
        qr = a.get("qrImage") or a.get("qrCodeUrl") or ""
        qr_http = "skip"
        if qr:
            _, qr_out, _ = run(client, f"curl -s -o /dev/null -w '%{{http_code}}' '{qr}'")
            qr_http = qr_out.strip()
        print(f"    {method}: enabled={enabled} qr={qr_http} url={qr[:70]}")

    print("\n=== ADMIN SPA ===")
    _, admin_http, _ = run(client, f"curl -s -o /dev/null -w '%{{http_code}}' {BASE}/admin/")
    print(f"  /admin/ -> HTTP {admin_http.strip()}")

    client.close()
    fails = [p for p, (ok, _) in page_results.items() if not ok]
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
