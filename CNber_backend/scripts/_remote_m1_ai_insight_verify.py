#!/usr/bin/env python3
"""Verify M1 AI profile insight endpoints."""
import json
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"


def run(client, cmd, timeout=120):
    print(f"\n$ {cmd[:180]}")
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
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    verify_js = r"""
const http = require('http');
const pairs = [
  ['13800000000','Admin123456'],
  ['13800138000','123456'],
];
function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const r = http.request({ hostname: '127.0.0.1', port: 3100, path, method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
(async () => {
  let token = '';
  for (const [phone, password] of pairs) {
    const login = await req('POST', '/api/auth/login', '', { phone, password });
    if (login.json?.code === 0 && login.json?.data?.user?.role === 'admin') {
      token = login.json.data.token;
      console.log('ADMIN_LOGIN', phone);
      break;
    }
  }
  if (!token) { console.log('NO_ADMIN_LOGIN'); process.exit(1); }

  for (const [kind, base] of [['customer','/api/admin/profiles/customers'],['driver','/api/admin/profiles/drivers']]) {
    const list = await req('GET', base + '?page=1&pageSize=1', token);
    const rows = list.json?.data?.rows || [];
    const pid = rows[0]?._id;
    console.log(kind + '_profiles', rows.length, 'profile_id', pid || 'none');
    if (!pid) continue;
    const gen = await req('POST', base + '/' + pid + '/ai-summary', token, {});
    const insight = gen.json?.data?.aiInsight;
    console.log(kind + '_ai_summary_http', gen.status);
    console.log(kind + '_insight', JSON.stringify({
      tags: insight?.tags,
      summary: insight?.summary?.slice(0, 120),
      riskLevel: insight?.riskLevel,
      recommendations: insight?.recommendations,
      version: insight?.version,
    }));
    const ok = insight?.tags?.length && insight?.summary && insight?.recommendations?.length;
    const driverOk = kind !== 'driver' || insight?.riskLevel;
    console.log(kind + '_verify', ok && driverOk ? 'PASS' : 'FAIL');
  }
})();
"""
    sftp = c.open_sftp()
    with sftp.open(f"{REMOTE}/scripts/_verify_ai_insight.js", "w") as f:
        f.write(verify_js.replace("\r\n", "\n"))
    sftp.close()

    run(c, f"cd {REMOTE} && node scripts/_verify_ai_insight.js")
    c.close()


if __name__ == "__main__":
    main()
