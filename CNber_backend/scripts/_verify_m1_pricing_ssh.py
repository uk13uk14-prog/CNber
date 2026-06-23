#!/usr/bin/env python3
import json
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"


def run(client, cmd):
    _, o, e = client.exec_command(cmd, timeout=30)
    return (o.read() + e.read()).decode("utf-8", "replace")


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    login_raw = run(
        client,
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}'",
    )
    print("login:", login_raw[:300] or "(empty)")
    token = ""
    if login_raw.strip():
        try:
            token = json.loads(login_raw).get("data", {}).get("token", "")
        except json.JSONDecodeError as e:
            print("login parse error:", e)

    for path in [
        "/admin/settings/exchange-rate",
        "/admin/pricing/fixed",
        "/admin/pricing/routes",
    ]:
        code = run(
            client,
            f"curl -s -o /dev/null -w '%{{http_code}}' "
            f"http://127.0.0.1:3100/api{path} -H 'Authorization: Bearer {token}'",
        ).strip()
        body = run(
            client,
            f"curl -s http://127.0.0.1:3000/api{path} -H 'Authorization: Bearer {token}'",
        ).strip()
        try:
            parsed = json.loads(body)
            ok = parsed.get("code") == 0
        except Exception:
            ok = False
        print(f"GET {path} -> HTTP {code} api_ok={ok} snippet={body[:100]}")

    bundle = run(
        client,
        f"grep PricingRulesView {REMOTE}/public/admin/index.html",
    ).strip()
    print("index bundle:", bundle)

    pm2 = run(client, "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; pm2 list").strip()
    print("pm2:", pm2[-400:] if len(pm2) > 400 else pm2)

    client.close()


if __name__ == "__main__":
    main()
