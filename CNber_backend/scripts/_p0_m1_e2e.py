#!/usr/bin/env python3
"""M1 P0 HTTP end-to-end smoke: deposit submit + admin review APIs."""
import json
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
BASE = "http://127.0.0.1:3100"


def run(client, cmd):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}"
    )
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    code = stdout.channel.recv_exit_status()
    return code, out, err


def api(client, method, path, token=None, body=None):
    hdr = "-H 'Content-Type: application/json'"
    if token:
        hdr += f" -H 'Authorization: Bearer {token}'"
    data = ""
    if body is not None:
        payload = json.dumps(body).replace("'", "'\\''")
        data = f"-d '{payload}'"
    url = f"{BASE}{path}"
    _, out, _ = run(
        client,
        f"curl -s -w '__HTTP__%{{http_code}}' -X {method} '{url}' {hdr} {data}",
    )
    if "__HTTP__" not in out:
        return 0, {}, out
    text, http = out.rsplit("__HTTP__", 1)
    try:
        body_json = json.loads(text)
    except json.JSONDecodeError:
        body_json = {"raw": text[:300]}
    return int(http.strip()), body_json, text


def check_page(client, token, name, path):
    http, body, _ = api(client, "GET", path, token=token)
    ok = http == 200 and body.get("code") == 0
    print(f"  [{'OK' if ok else 'FAIL'}] {name} -> HTTP {http} {body.get('message','')}")
    return ok


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    print("=== 1. ADMIN PAGES API ===")
    http, login, _ = api(
        c, "POST", "/api/auth/login", body={"phone": "13800000000", "password": "Admin123456"}
    )
    admin_tok = login.get("data", {}).get("token", "")
    pages = [
        ("工作台", "/api/admin/dashboard"),
        ("订单", "/api/admin/orders?page=1&pageSize=5"),
        ("司机管理", "/api/admin/drivers?page=1&pageSize=5"),
        ("司机审核", "/api/admin/drivers/onboarding?page=1&pageSize=5"),
        ("客户管理", "/api/admin/customers?page=1&pageSize=5"),
        ("支付设置", "/api/admin/payment-accounts"),
        ("支付审核", "/api/admin/payment-reviews?stage=pending&page=1&pageSize=5"),
        ("财务-summary", "/api/admin/finance/summary"),
        ("财务-tx", "/api/admin/finance/transactions?page=1&pageSize=5"),
        ("财务-settle", "/api/admin/finance/driver-settlements?page=1&pageSize=5"),
        ("财务-recon", "/api/admin/finance/reconciliation?page=1&pageSize=5"),
        ("报价设置", "/api/admin/pricing-rules"),
    ]
    page_ok = all(check_page(c, admin_tok, n, p) for n, p in pages)

    print("\n=== 2. PAYMENT ACCOUNTS ===")
    http, pub, _ = api(c, "GET", "/api/payment/accounts")
    accounts = pub.get("data", {}).get("accounts", [])
    methods = {a.get("method") or a.get("paymentType") for a in accounts}
    pay_ok = http == 200 and "wechat" in methods and "alipay" in methods
    print(f"  wechat+alipay: {pay_ok}, count={len(accounts)}")
    for a in accounts:
        m = a.get("method") or a.get("paymentType")
        qr = a.get("qrImage") or a.get("qrCodeUrl") or ""
        if qr:
            _, qr_http, _ = run(c, f"curl -s -o /dev/null -w '%{{http_code}}' '{qr}'")
            print(f"    {m} enabled={a.get('enabled', True)} qr_http={qr_http.strip()}")

    print("\n=== 3. PASSENGER DEPOSIT FLOW (API) ===")
    cust_phone = f"1390000{int(time.time()) % 10000:04d}"
    # register + login customer
    api(c, "POST", "/api/auth/register", body={"phone": cust_phone, "password": "Test123456", "role": "user"})
    http, clogin, _ = api(c, "POST", "/api/auth/login", body={"phone": cust_phone, "password": "Test123456"})
    cust_tok = clogin.get("data", {}).get("token", "")
    print(f"  customer {cust_phone} login HTTP {http}")

    http, created, _ = api(
        c,
        "POST",
        "/api/order/create",
        token=cust_tok,
        body={
            "pickup": "Heathrow T5",
            "destination": "Central London",
            "serviceType": "pickup",
        },
    )
    order = created.get("data", {}).get("order") or created.get("data") or {}
    order_id = str(order.get("_id") or order.get("id") or "")
    print(f"  create order HTTP {http} id={order_id[:12]}...")

    # auto quote if needed
    if order.get("status") in ("pending", "created") or not order.get("quotedPrice"):
        http, q, _ = api(c, "POST", "/api/order/auto-quote", token=cust_tok, body={"orderId": order_id})
        print(f"  auto-quote HTTP {http}")

    http, cp, _ = api(c, "POST", "/api/order/confirm-price", token=cust_tok, body={"orderId": order_id})
    print(f"  confirm-price HTTP {http}")

    # tiny 1x1 jpeg base64
    b64 = (
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
        "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQAB"
        "AQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQE"
        "AAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
    )
    http, up, _ = api(
        c,
        "POST",
        f"/api/order/{order_id}/payment-proof/upload",
        token=cust_tok,
        body={"imageBase64": b64},
    )
    proof_url = (up.get("data") or {}).get("url", "")
    upload_ok = http == 200 and bool(proof_url)
    print(f"  upload proof HTTP {http} url={proof_url[:60]}")

    http, accts, _ = api(c, "GET", "/api/admin/payment-accounts", token=admin_tok)
    acc_id = None
    for row in (accts.get("data") or {}).get("accounts") or accts.get("data") or []:
        if (row.get("method") or row.get("paymentType")) == "wechat":
            acc_id = row.get("_id")
            break
    if not acc_id and accounts:
        acc_id = accounts[0].get("_id")

    http, dep, _ = api(
        c,
        "POST",
        f"/api/order/{order_id}/deposit/submit",
        token=cust_tok,
        body={
            "payerName": "P0Test",
            "paidAmount": 10,
            "proofImage": proof_url,
            "paymentAccountId": acc_id,
            "paymentMethod": "wechat",
            "note": "P0 smoke",
        },
    )
    deposit_ok = http == 200
    print(f"  deposit submit HTTP {http} msg={dep.get('message','')}")

    print("\n=== 4. ADMIN REVIEW ===")
    http, reviews, _ = api(
        c, "GET", "/api/admin/payment-reviews?stage=deposit&page=1&pageSize=20", token=admin_tok
    )
    items = (reviews.get("data") or {}).get("items") or []
    found = any(str(it.get("orderId")) == order_id for it in items)
    print(f"  payment-reviews HTTP {http} found_order={found} items={len(items)}")

    http, confirm, _ = api(
        c,
        "PATCH",
        f"/api/admin/orders/{order_id}/payment/deposit/confirm",
        token=admin_tok,
        body={},
    )
    confirm_ok = http == 200
    print(f"  deposit confirm HTTP {http}")

    http, detail, _ = api(c, "GET", f"/api/admin/orders/{order_id}", token=admin_tok)
    od = (detail.get("data") or {}).get("order") or detail.get("data") or {}
    dep_st = od.get("depositStatus") or (od.get("payment") or {}).get("depositStatus")
    print(f"  order depositStatus={dep_st} depositPaid={od.get('depositPaid')}")

    print("\n=== 5. DRIVER API CHECK ===")
    http, dlogin, _ = api(
        c, "POST", "/api/auth/login", body={"phone": "13900000001", "password": "Test123456"}
    )
    if http != 200 or not (dlogin or {}).get("data"):
        api(
            c,
            "POST",
            "/api/auth/register",
            body={"phone": "13900000001", "password": "Test123456", "role": "driver"},
        )
        http, dlogin, _ = api(
            c, "POST", "/api/auth/login", body={"phone": "13900000001", "password": "Test123456"}
        )
    driver_tok = (dlogin or {}).get("data", {}).get("token", "")
    http, dlist, _ = api(c, "GET", "/api/order/list", token=driver_tok)
    print(f"  driver login HTTP {http} list HTTP {http} code={dlist.get('code')}")

    print("\n=== 6. FINANCE ===")
    check_page(c, admin_tok, "finance-summary-post", "/api/admin/finance/summary")

    c.close()
    print("\n=== SUMMARY ===")
    print(f"pages_ok={page_ok} pay_ok={pay_ok} upload_ok={upload_ok} deposit_ok={deposit_ok}")
    print(f"review_found={found} confirm_ok={confirm_ok} depositStatus={dep_st}")


if __name__ == "__main__":
    main()
