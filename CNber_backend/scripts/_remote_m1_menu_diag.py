#!/usr/bin/env python3
"""Diagnose M1 admin menu + deployed bundle."""
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_ADMIN = "/Users/agent001/Desktop/CNber/CNber_backend/public/admin"


def run(c, cmd):
    _, stdout, stderr = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=60,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return (out + err).strip()


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    cmds = [
        f"ls -la {REMOTE_ADMIN}/assets/index*.js 2>/dev/null | tail -3",
        f"ls -la {REMOTE_ADMIN}/assets/MainLayout*.js 2>/dev/null | tail -3",
        f"grep -l 'operations-dashboard' {REMOTE_ADMIN}/assets/*.js 2>/dev/null || echo NO_ops_dash_path",
        f"grep -rl '运营驾驶舱' {REMOTE_ADMIN}/assets/*.js 2>/dev/null | head -5 || echo NO_cn_label",
        f"grep -rl '运营中心' {REMOTE_ADMIN}/assets/*.js 2>/dev/null | head -5 || echo NO_ops_center",
        f"head -c 500 {REMOTE_ADMIN}/index.html",
        (
            "TOKEN=$(curl -s -X POST http://127.0.0.1:3100/api/auth/login "
            "-H 'Content-Type: application/json' "
            "-d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}' "
            "| python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))\") && "
            "curl -s -H \"Authorization: Bearer $TOKEN\" http://127.0.0.1:3100/api/admin/me/permissions "
            "| python3 -c \"import sys,json; d=json.load(sys.stdin); print('role', d.get('data',{}).get('role')); "
            "p=d.get('data',{}).get('permissions',{}); print('trial_ops', p.get('trial_operations')); "
            "print('dashboard', p.get('dashboard')); print('system_health', p.get('system_health'))\""
        ),
        f"test -f /Users/agent001/Desktop/CNber/CNber_admin_web_v1.0/src/utils/staffRoles.js && "
        f"grep -n '运营驾驶舱' /Users/agent001/Desktop/CNber/CNber_admin_web_v1.0/src/utils/staffRoles.js || "
        f"echo NO_source_on_m1",
    ]
    for cmd in cmds:
        print("\n===", cmd[:100], "===\n", run(c, cmd))

    c.close()


if __name__ == "__main__":
    main()
