#!/usr/bin/env python3
"""Deploy CRM marketing center to M1."""
import json
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber"
REMOTE_BACKEND = f"{ROOT}/CNber_backend"
REMOTE_ADMIN = f"{REMOTE_BACKEND}/public/admin"
LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LOCAL_DIST = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0/dist")
LOCAL_BACKEND = os.path.join(LOCAL_ROOT, "CNber_backend")

BACKEND_FILES = [
    "models/MarketingAudience.js",
    "models/CustomerProfile.js",
    "utils/crmAudiencePresets.js",
    "utils/crmAudienceResolver.js",
    "utils/profileSync.js",
    "controllers/crmController.js",
    "routes/admin.js",
    "scripts/smoke_crm.js",
]

ADMIN_SRC_FILES = [
    "src/router/index.js",
    "src/api/admin.js",
    "src/utils/staffRoles.js",
    "src/views/CRMMarketingView.vue",
]


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


def run(client, cmd, timeout=120):
    print(f"\n$ {cmd[:200]}")
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print("STDERR:", err.rstrip(), file=sys.stderr)
    return stdout.channel.recv_exit_status(), out, err


def upload_tree(sftp, local_dir, remote_dir):
    for root, _, files in os.walk(local_dir):
        for name in files:
            local_path = os.path.join(root, name)
            rel = os.path.relpath(local_path, local_dir).replace("\\", "/")
            remote_path = f"{remote_dir}/{rel}"
            put_lf(sftp, local_path, remote_path)
            print(f"upload dist/{rel}")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: run npm run build in CNber_admin_web_v1.0 first")
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    print("===== upload admin dist =====")
    upload_tree(sftp, LOCAL_DIST, REMOTE_ADMIN)

    print("\n===== upload backend CRM files =====")
    for rel in BACKEND_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"upload backend/{rel}")

    for rel in ADMIN_SRC_FILES:
        local_path = os.path.join(LOCAL_ROOT, "CNber_admin_web_v1.0", rel.replace("/", os.sep))
        remote_path = f"{ROOT}/CNber_admin_web_v1.0/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"upload admin/{rel}")

    sftp.close()

    run(
        client,
        f"grep -R 'CRM营销中心' {REMOTE_ADMIN}/assets 2>/dev/null | head -2 || true",
    )

    print("\n===== restart backend =====")
    run(
        client,
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env",
    )
    time.sleep(3)

    verify_js = r"""
const http = require('http');
const pairs = [['13800000000','Admin123456']];
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
        try { resolve({ status: res.statusCode, json: JSON.parse(d), raw: d }); }
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
      break;
    }
  }
  if (!token) { console.log('NO_ADMIN'); process.exit(1); }

  const list = await req('GET', '/api/admin/crm/audiences', token);
  console.log('crm_list_http', list.status, 'presets', list.json?.data?.presets?.length);

  const create = await req('POST', '/api/admin/crm/audiences', token, {
    name: '机场客户名单',
    description: 'M1验证：机场用户+订单>=2+营销同意',
    filters: {
      totalOrdersMin: 2,
      aiTagsInclude: ['机场用户'],
      marketingConsent: true
    }
  });
  const aud = create.json?.data;
  console.log('create_http', create.status, 'count', aud?.count, 'id', aud?._id);

  if (!aud?._id) { console.log('CREATE_FAIL', create.raw?.slice(0,300)); process.exit(1); }

  const detail = await req('GET', '/api/admin/crm/audiences/' + aud._id, token);
  console.log('detail_customers', detail.json?.data?.customers?.length);

  const exp = await req('GET', '/api/admin/crm/audiences/' + aud._id + '/export', token);
  console.log('export_http', exp.status, 'csv_head', exp.raw?.slice(0, 80));
  console.log('CRM_VERIFY', exp.status === 200 && exp.raw?.includes('phone') ? 'PASS' : 'FAIL');
})();
"""
    sftp = client.open_sftp()
    with sftp.open(f"{REMOTE_BACKEND}/scripts/_verify_crm_api.js", "w") as f:
        f.write(verify_js.replace("\r\n", "\n"))
    sftp.close()

    run(
        client,
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && node scripts/smoke_crm.js",
    )
    run(
        client,
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; "
        f"cd {REMOTE_BACKEND} && node scripts/_verify_crm_api.js",
    )

    run(client, "curl -s -o /dev/null -w 'admin HTTP %{http_code}\\n' http://127.0.0.1:3100/admin/")
    client.close()
    print("\nDONE — hard refresh M1 /admin/crm")


if __name__ == "__main__":
    main()
