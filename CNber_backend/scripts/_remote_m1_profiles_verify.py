#!/usr/bin/env python3
"""Verify M1 profiles deploy: grep, API, backfill, counts."""
import json
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"


def run(client, cmd, timeout=180):
    print(f"\n$ {cmd[:200]}")
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print("STDERR:", err.rstrip())
    return stdout.channel.recv_exit_status(), out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    run(c, f"grep -R '客户画像' {REMOTE}/public/admin/assets/MainLayout*.js | head -1")
    run(c, f"grep -R '司机画像' {REMOTE}/public/admin/assets/MainLayout*.js | head -1")
    run(c, f"grep -E 'MONGO' {REMOTE}/.env 2>/dev/null | head -3")

    verify_js = r"""
const http = require('http');
const pairs = [
  ['13800000000','Admin123456'],
  ['13800138000','123456'],
  ['13900000002','Client123456'],
];
function login(phone, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ phone, password });
    const req = http.request({
      hostname: '127.0.0.1', port: 3100, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 3100, path, method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.end();
  });
}
(async () => {
  for (const [phone, password] of pairs) {
    try {
      const j = await login(phone, password);
      if (j.code === 0 && j.data?.user?.role === 'admin') {
        const token = j.data.token;
        console.log('ADMIN_LOGIN', phone);
        for (const p of ['/api/admin/profiles/customers?page=1&pageSize=2', '/api/admin/profiles/drivers?page=1&pageSize=2']) {
          const r = await get(p, token);
          console.log('API', p, 'HTTP', r.status, r.body.slice(0, 300));
        }
        return;
      }
    } catch (e) {}
  }
  console.log('NO_ADMIN_LOGIN');
})();
"""
    sftp = c.open_sftp()
    with sftp.open(f"{REMOTE}/scripts/_verify_profiles_api.js", "w") as f:
        f.write(verify_js.replace("\r\n", "\n"))
    sftp.close()

    run(c, f"cd {REMOTE} && node scripts/_verify_profiles_api.js")

    run(
        c,
        f"cd {REMOTE} && node -e \"require('dotenv').config(); console.log('env MONGO_URI', !!process.env.MONGO_URI);\"",
    )
    run(c, f"cd {REMOTE} && node scripts/backfill_profiles_from_orders.js", timeout=300)
    run(
        c,
        f"cd {REMOTE} && node -e \""
        "require('dotenv').config();"
        "const m=require('mongoose');"
        "const C=require('./models/CustomerProfile');"
        "const D=require('./models/DriverProfile');"
        "(async()=>{"
        "const uri=process.env.MONGO_URI||process.env.MONGODB_URI;"
        "if(!uri){console.log('NO_URI');process.exit(1);}"
        "await m.connect(uri);"
        "console.log(JSON.stringify({customerProfiles:await C.countDocuments(),driverProfiles:await D.countDocuments()}));"
        "await m.disconnect();"
        "})();"
        "\"",
    )

    c.close()


if __name__ == "__main__":
    main()
