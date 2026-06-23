#!/usr/bin/env python3
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(c, cmd, timeout=300):
    print(f"\n$ {cmd}")
    _, stdout, _ = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out.rstrip())
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    put_lf(
        sftp,
        os.path.join(LOCAL_BACKEND, "scripts/backfill_profiles_from_orders.js"),
        f"{REMOTE}/scripts/backfill_profiles_from_orders.js",
    )
    api_js = """
const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request({ hostname: '127.0.0.1', port: 3100, path, method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
(async () => {
  const login = await req('POST', '/api/auth/login', { phone: '13800000000', password: 'Admin123456' });
  const j = JSON.parse(login.body);
  const token = j.data && j.data.token;
  console.log('login code', j.code, 'role', j.data && j.data.user && j.data.user.role);
  for (const p of [
    '/api/admin/profiles/customers?page=1&pageSize=2',
    '/api/admin/profiles/drivers?page=1&pageSize=2',
  ]) {
    const r = await req('GET', p, null, token);
    console.log(p, 'HTTP', r.status, r.body.slice(0, 400));
  }
})();
"""
    with sftp.open(f"{REMOTE}/scripts/_tmp_profile_api.js", "w") as f:
        f.write(api_js.replace("\r\n", "\n"))
    sftp.close()

    run(client, f"cd {REMOTE} && node scripts/backfill_profiles_from_orders.js")
    run(
        client,
        f"cd {REMOTE} && node -e \""
        "require('dotenv').config();"
        "const m=require('mongoose');"
        "const C=require('./models/CustomerProfile');"
        "const D=require('./models/DriverProfile');"
        "(async()=>{"
        "await m.connect(process.env.MONGO_URL);"
        "console.log(JSON.stringify({customerProfiles:await C.countDocuments(),driverProfiles:await D.countDocuments()}));"
        "await m.disconnect();"
        "})();"
        "\"",
    )
    run(client, f"cd {REMOTE} && node scripts/_tmp_profile_api.js")
    client.close()


if __name__ == "__main__":
    main()
