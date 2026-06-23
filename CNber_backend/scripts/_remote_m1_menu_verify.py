#!/usr/bin/env python3
"""Verify M1 admin menu restructure deploy."""
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend/public/admin"


def run(c, cmd):
    print(f"\n$ {cmd}")
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=60,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out.rstrip())
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    for label in ["订单管理", "调度中心", "运营中心", "系统管理", "优惠券"]:
        run(c, f"grep -R '{label}' {REMOTE}/assets/MainLayout*.js | head -1")

    run(c, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")
    run(c, f"grep -l 'dispatch-center' {REMOTE}/assets/index*.js | head -1")

    c.close()
    print("\nDONE — hard refresh /admin on M1")


if __name__ == "__main__":
    main()
