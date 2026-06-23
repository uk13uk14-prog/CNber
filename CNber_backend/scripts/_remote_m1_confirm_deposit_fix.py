#!/usr/bin/env python3
"""Deploy canConfirmDeposit fix to M1 and verify CNB-20260622-001."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
ORDER_NO = "CNB-20260622-001"

FILES = [
    ("utils/orderPaymentSync.js", "utils/orderPaymentSync.js"),
    ("controllers/orderPaymentController.js", "controllers/orderPaymentController.js"),
    ("scripts/smoke_can_confirm_deposit.js", "scripts/smoke_can_confirm_deposit.js"),
]


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(c, cmd, timeout=120):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=timeout
    )
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    return o.channel.recv_exit_status(), out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    local_base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = c.open_sftp()
    for rel, remote_rel in FILES:
        put_lf(sftp, os.path.join(local_base, rel), f"{ROOT}/{remote_rel}")
        print("uploaded", rel)
    sftp.close()

    steps = [
        (f"cd {ROOT} && node scripts/smoke_can_confirm_deposit.js", "smoke"),
        (f"cd {ROOT} && pm2 restart cnber-backend --update-env && sleep 2", "pm2"),
    ]
    for cmd, label in steps:
        print(f"\n>>> {label}")
        code, out, err = run(c, cmd)
        print(out or err)
        if code != 0:
            c.close()
            sys.exit(code)

    login_body = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, lo, _ = run(
        c,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_body}'",
    )
    tok = json.loads(lo)["data"]["token"]

    _, out, _ = run(
        c,
        f"cd {ROOT} && node -e \"require('dotenv').config();const mongoose=require('mongoose');const Order=require('./models/Order');(async()=>{{await mongoose.connect(process.env.MONGO_URI||process.env.MONGO_URL);const o=await Order.findOne({{orderNo:'{ORDER_NO}'}}).lean();console.log(o._id.toString());await mongoose.disconnect();}})();\"",
    )
    order_id = out.strip().splitlines()[-1]
    print("order_id", order_id)

    print("\n>>> PATCH deposit/confirm")
    _, patch, _ = run(
        c,
        f"curl -s -w '\\nHTTP:%{{http_code}}' -X PATCH "
        f"'http://127.0.0.1:3100/api/admin/orders/{order_id}/payment/deposit/confirm' "
        f"-H 'Authorization: Bearer {tok}' -H 'Content-Type: application/json' -d '{{}}'",
    )
    print(patch)

    verify_js = r"""
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow');
(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
  const o = await Order.findOne({ orderNo: 'CNB-20260622-001' }).lean();
  console.log(JSON.stringify({
    depositStatus: o.depositStatus,
    paymentStage: o.paymentStage,
    paymentStatus: o.paymentStatus,
    depositPaid: o.depositPaid,
    confirmedAt: o.depositPaymentInfo?.confirmedAt,
    canDispatchByDeposit: canDispatchByDeposit(o)
  }, null, 2));
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
"""
    sftp = c.open_sftp()
    with sftp.open(f"{ROOT}/scripts/_verify_confirm_001.js", "wb") as rf:
        rf.write(verify_js.encode("utf-8"))
    sftp.close()

    print("\n>>> DB verify")
    _, out, _ = run(c, f"cd {ROOT} && node scripts/_verify_confirm_001.js")
    print(out)

    c.close()


if __name__ == "__main__":
    main()
