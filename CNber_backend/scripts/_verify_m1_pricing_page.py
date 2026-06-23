#!/usr/bin/env python3
"""Verify M1 pricing APIs and admin bundle."""
import json
import os
import sys
import urllib.request

HOST = "192.168.1.187"
BASE = f"http://{HOST}:3000/api"
LOGIN = {"phone": "13800000000", "password": "Admin123456"}


def req(method, path, token=None, body=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode())


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    status, login = req("POST", "/auth/login", body=LOGIN)
    token = login.get("data", {}).get("token")
    print("login", status, "token", "ok" if token else "missing")
    if not token:
        sys.exit(1)

    for path in [
        "/admin/settings/exchange-rate",
        "/admin/pricing/fixed",
        "/admin/pricing/routes",
    ]:
        try:
            code, body = req("GET", path, token=token)
            ok = body.get("code") == 0
            print(f"GET {path} -> HTTP {code} code={body.get('code')} ok={ok}")
        except Exception as e:
            print(f"GET {path} -> FAIL {e}")

    admin_index = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../public/admin/index.html")
    )
    print("local admin index exists:", os.path.isfile(admin_index))


if __name__ == "__main__":
    main()
