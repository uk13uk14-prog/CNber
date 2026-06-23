#!/usr/bin/env python3
import json
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"


def run(client, cmd):
    _, o, e = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=30
    )
    return (o.read() + e.read()).decode("utf-8", "replace")


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    login = json.loads(
        run(
            client,
            "curl -s -X POST http://127.0.0.1:3100/api/auth/login "
            "-H 'Content-Type: application/json' "
            "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}'",
        )
    )
    token = login["data"]["token"]

    for path in [
        "/admin/settings/exchange-rate",
        "/admin/pricing/fixed",
        "/admin/pricing/routes",
    ]:
        body = run(
            client,
            f"curl -s http://127.0.0.1:3100/api{path} -H 'Authorization: Bearer {token}'",
        )
        parsed = json.loads(body)
        print(path, "code=", parsed.get("code"), "keys=", list((parsed.get("data") or {}).keys())[:5])

    idx = run(client, f"cat {REMOTE}/public/admin/index.html")
    print("index.html snippet:", idx[:500])
    client.close()


if __name__ == "__main__":
    main()
