#!/usr/bin/env python3
"""M1: full driver login + dashboard API check."""
import json
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.187"
USER = "agent001"
PASS = "121212"


def run(c, cmd):
    _, o, e = c.exec_command(
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; " + cmd
    )
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS)

    login_cmd = (
        "curl -s -X POST http://192.168.1.187:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13900000001\",\"password\":\"123456\"}'"
    )
    out, _ = run(c, login_cmd)
    print("=== login ===")
    print(out)
    try:
        body = json.loads(out)
        token = body["data"]["token"]
        role = body["data"]["user"]["role"]
        print("role=", role)
    except Exception as ex:
        print("parse fail", ex)
        c.close()
        return

    for path in ["/driver/dashboard", "/driver/orders", "/order/list"]:
        cmd = (
            f"curl -s -w '\\nHTTP:%{{http_code}}' "
            f"http://192.168.1.187:3100/api{path} "
            f"-H 'Authorization: Bearer {token}'"
        )
        out, _ = run(c, cmd)
        print(f"\n=== GET {path} ===")
        print(out[:800])

    c.close()


if __name__ == "__main__":
    main()
