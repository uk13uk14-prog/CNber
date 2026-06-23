#!/usr/bin/env python3
"""Deploy GBP→CNY exchange rate feature to M1 and verify."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_CNBER = "/Users/agent001/Desktop/CNber"
REMOTE_BACKEND = f"{REMOTE_CNBER}/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_ADMIN_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0/dist")
)

BACKEND_FILES = [
    "models/SystemSetting.js",
    "utils/exchangeRate.js",
    "utils/orderPresentation.js",
    "utils/scheduledPickup.js",
    "controllers/settingsController.js",
    "controllers/adminController.js",
    "controllers/orderController.js",
    "controllers/orderPaymentController.js",
    "routes/admin.js",
    "scripts/smoke_exchange_rate.js",
]

LOGIN = {"phone": "13800000000", "password": "Admin123456"}


def put_lf(sftp, local_path, remote_path):
    remote_dir = os.path.dirname(remote_path.replace("\\", "/"))
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(client, cmd, timeout=300):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def mkdir_p(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not os.path.isdir(LOCAL_ADMIN_DIST):
        print(f"ERROR: missing admin dist at {LOCAL_ADMIN_DIST}")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST} ...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()

    print("\n=== Upload backend files ===")
    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        if not os.path.isfile(local_path):
            print(f"ERROR: missing {local_path}")
            sys.exit(1)
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"  {rel}")

    print("\n=== Upload public/admin dist ===")
    remote_admin = f"{REMOTE_BACKEND}/public/admin"
    run(client, f"mkdir -p {remote_admin} && rm -rf {remote_admin}/*")
    mkdir_p(sftp, remote_admin)
    count = 0
    for root, _, files in os.walk(LOCAL_ADMIN_DIST):
        rel = os.path.relpath(root, LOCAL_ADMIN_DIST).replace("\\", "/")
        rdir = remote_admin if rel == "." else f"{remote_admin}/{rel}"
        mkdir_p(sftp, rdir)
        for f in files:
            put_lf(sftp, os.path.join(root, f), f"{rdir}/{f}")
            count += 1
    print(f"  uploaded {count} files to public/admin")
    sftp.close()

    print("\n=== Remote: npm install + smoke + pm2 restart ===")
    steps = [
        f"cd {REMOTE_BACKEND} && npm install",
        f"cd {REMOTE_BACKEND} && node scripts/smoke_exchange_rate.js",
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env",
        "sleep 3",
        "pm2 logs cnber-backend --lines 80 --nostream",
    ]
    for step in steps:
        print(f"\n>>> {step}")
        code, out, err = run(client, step, timeout=600)
        tail = (out or err)[-3500:]
        if tail.strip():
            print(tail)
        if code != 0 and "smoke_exchange_rate" in step:
            print(f"FAILED exit={code}")
            client.close()
            sys.exit(code)

    print("\n=== API verification ===")
    login_payload = json.dumps(LOGIN)
    code, out, err = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_payload}'",
    )
    try:
        token = json.loads(out)["data"]["token"]
        print("  login OK")
    except (json.JSONDecodeError, KeyError):
        print("  login FAILED:", out[:300])
        client.close()
        sys.exit(1)

    code, out, err = run(
        client,
        f"curl -s http://127.0.0.1:3100/api/admin/settings/exchange-rate "
        f"-H 'Authorization: Bearer {token}'",
    )
    print("\nGET /api/admin/settings/exchange-rate:")
    print(out)
    try:
        get_body = json.loads(out)
        assert get_body.get("code") == 0
        rate = get_body["data"]["rate"]
        print(f"  rate={rate}")
    except (json.JSONDecodeError, KeyError, AssertionError) as e:
        print(f"  GET verify FAILED: {e}")
        client.close()
        sys.exit(1)

    put_payload = json.dumps({"rate": 10})
    code, out, err = run(
        client,
        f"curl -s -X PUT http://127.0.0.1:3100/api/admin/settings/exchange-rate "
        f"-H 'Authorization: Bearer {token}' "
        f"-H 'Content-Type: application/json' "
        f"-d '{put_payload}'",
    )
    print("\nPUT /api/admin/settings/exchange-rate {rate:10}:")
    print(out)
    try:
        put_body = json.loads(out)
        assert put_body.get("code") == 0
        assert float(put_body["data"]["rate"]) == 10.0
        print("  PUT OK")
    except (json.JSONDecodeError, KeyError, AssertionError) as e:
        print(f"  PUT verify FAILED: {e}")
        client.close()
        sys.exit(1)

    code, out, err = run(
        client,
        f"curl -s 'http://127.0.0.1:3100/api/admin/orders?page=1&pageSize=5' "
        f"-H 'Authorization: Bearer {token}'",
    )
    print("\nOrders sample (CNY fields):")
    try:
        orders_body = json.loads(out)
        orders = orders_body.get("data", {}).get("orders", [])
        if orders:
            o = orders[0]
            print(
                f"  order={o.get('orderNo') or o.get('_id')} "
                f"amount(GBP)={o.get('amount')} "
                f"exchangeRate={o.get('exchangeRate')} "
                f"customerPriceCny={o.get('customerPriceCny')} "
                f"driverPriceCny={o.get('driverPriceCny')}"
            )
            if o.get("exchangeRate") is None:
                print("  WARN: exchangeRate missing on order")
        else:
            print("  (no orders in list)")
    except json.JSONDecodeError:
        print("  orders parse failed:", out[:200])

    print("\n=== Admin bundle checks ===")
    checks = [
        (f"grep -l '英镑兑人民币' {REMOTE_BACKEND}/public/admin/assets/PricingRulesView*.js | head -1", "pricing exchange card"),
        (f"grep -o '/ ¥[0-9]' {REMOTE_BACKEND}/public/admin/assets/OrdersView*.js | head -1", "orders dual currency"),
        ("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/admin/", "admin HTTP"),
    ]
    for cmd, label in checks:
        code, out, err = run(client, cmd)
        print(f"  {label}: {(out or err).strip() or 'OK'}")

    client.close()
    print("\n=== M1 exchange-rate deploy complete ===")


if __name__ == "__main__":
    main()
