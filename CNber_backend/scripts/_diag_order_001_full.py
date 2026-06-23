#!/usr/bin/env python3
"""Diagnose CNB-20260622-001 deposit confirm + dispatch."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
ORDER_NO = "CNB-20260622-001"
DRIVER_UID = "69eb518cc86ce945794f1939"

JS = r"""
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow');
const { canConfirmDeposit } = require('../utils/orderPaymentSync');

function depositConfirmedForDispatch(order) {
  if (!order) return false;
  if (order.payment?.depositStatus === 'confirmed') return true;
  if (order.depositStatus === 'confirmed') return true;
  if (!order.paymentStage || order.paymentStage === 'none') {
    return Boolean(order.depositPaid);
  }
  return false;
}

function depositSubmittedPendingConfirm(order) {
  if (!order) return false;
  if (order.depositStatus === 'submitted') return true;
  if (order.paymentStage === 'deposit_submitted') return true;
  return false;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber');
  const o = await Order.findOne({ orderNo: ORDER_NO }).lean();
  if (!o) {
    console.log(JSON.stringify({ error: 'NOT_FOUND' }));
    process.exit(1);
  }

  const active = ['assigned', 'accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress'];
  const allOrders = await Order.find({}).select('orderNo status driverId assignedDriver').lean();
  const busyIds = new Set();
  for (const row of allOrders) {
    if (!active.includes(row.status)) continue;
    const id = row.driverId ? String(row.driverId) : row.assignedDriver ? String(row.assignedDriver) : '';
    if (id) busyIds.add(id);
  }

  const drivers = await User.find({ role: 'driver' }).select('phone driverProfile status').lean();
  const driver139 = drivers.find((d) => d.phone === '13900000001');

  const logs = (o.operationLogs || []).slice(-15).map((l) => ({
    action: l.action,
    at: l.at || l.createdAt,
    note: l.note || l.message || ''
  }));

  console.log(JSON.stringify({
    section: 'DATABASE',
    orderNo: o.orderNo,
    _id: String(o._id),
    status: o.status,
    depositStatus: o.depositStatus,
    paymentStage: o.paymentStage,
    paymentStatus: o.paymentStatus,
    depositPaid: o.depositPaid,
    depositConfirmed: o.depositConfirmed,
    depositConfirmedAt: o.depositConfirmedAt,
    confirmedAt: o.depositPaymentInfo?.confirmedAt,
    depositPaymentInfo: o.depositPaymentInfo,
    payment: o.payment,
    canDispatchByDeposit: canDispatchByDeposit(o),
    canConfirmDeposit: canConfirmDeposit(o),
    frontend: {
      depositConfirmedForDispatch: depositConfirmedForDispatch(o),
      depositSubmittedPendingConfirm: depositSubmittedPendingConfirm(o),
      hasDeposit: depositConfirmedForDispatch(o)
    },
    operationLogsTail: logs,
    driverBusy: {
      activeDriverIds: [...busyIds],
      driver13900000001UserId: DRIVER_UID,
      is139Busy: busyIds.has(DRIVER_UID),
      holdingOrders: allOrders
        .filter((row) => active.includes(row.status))
        .filter((row) => String(row.driverId || '') === DRIVER_UID || String(row.assignedDriver || '') === DRIVER_UID)
        .map((row) => ({ orderNo: row.orderNo, status: row.status }))
    },
    driver139: driver139
      ? {
          _id: String(driver139._id),
          phone: driver139.phone,
          status: driver139.status,
          driverProfile: driver139.driverProfile
        }
      : null
  }, null, 2));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
""".replace("ORDER_NO", repr(ORDER_NO)).replace("DRIVER_UID", repr(DRIVER_UID))


def run(c, cmd, timeout=120):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=timeout
    )
    return o.read().decode("utf-8", errors="replace"), e.read().decode("utf-8", errors="replace")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = c.open_sftp()
    remote = f"{ROOT}/scripts/_diag_order_001.js"
    with sftp.open(remote, "wb") as rf:
        rf.write(JS.encode("utf-8"))
    sftp.close()

    print("=== 一、数据库 ===")
    out, err = run(c, f"cd {ROOT} && node scripts/_diag_order_001.js")
    print(out)
    if err.strip():
        print("ERR:", err)

    login_body = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    lo, _ = run(
        c,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_body}'",
    )
    tok = json.loads(lo)["data"]["token"]
    order_id = None
    try:
        order_id = json.loads(out.split("===", 1)[0] if "===" in out else out)
    except Exception:
        pass
    if order_id is None:
        try:
            order_id = json.loads(out)["_id"]
        except Exception:
            order_id = json.loads(out).get("_id") if isinstance(json.loads(out), dict) else None

    parsed_db = json.loads(out)
    order_id = parsed_db["_id"]

    print("\n=== 二、GET /api/admin/orders ===")
    for page in [1, 2, 3]:
        pr, _ = run(
            c,
            f"curl -s 'http://127.0.0.1:3100/api/admin/orders?page={page}&pageSize=20' "
            f"-H 'Authorization: Bearer {tok}'",
        )
        data = json.loads(pr)
        items = data.get("data", {}).get("orders") or []
        hit = [x for x in items if x.get("orderNo") == ORDER_NO]
        if hit:
            o = hit[0]
            print(f"found on page {page}")
            print(json.dumps({
                "orderNo": o.get("orderNo"),
                "_id": o.get("_id"),
                "status": o.get("status"),
                "depositStatus": o.get("depositStatus"),
                "paymentStage": o.get("paymentStage"),
                "paymentStatus": o.get("paymentStatus"),
                "depositPaid": o.get("depositPaid"),
                "payment.depositStatus": (o.get("payment") or {}).get("depositStatus"),
                "depositPaymentInfo.confirmedAt": (o.get("depositPaymentInfo") or {}).get("confirmedAt"),
            }, ensure_ascii=False, indent=2))
            break
    else:
        print("NOT in first 3 pages")

    print("\n=== 二b、PATCH deposit/confirm（探测，不依赖前端）===")
    patch, _ = run(
        c,
        f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -X PATCH "
        f"'http://127.0.0.1:3100/api/admin/orders/{order_id}/payment/deposit/confirm' "
        f"-H 'Authorization: Bearer {tok}' -H 'Content-Type: application/json' -d '{{}}'",
    )
    print(patch)

    print("\n=== 一b、确认后再查库 ===")
    out2, _ = run(c, f"cd {ROOT} && node scripts/_diag_order_001.js")
    print(out2)

    print("\n=== 三、available drivers ===")
    av, _ = run(
        c,
        f"curl -s 'http://127.0.0.1:3100/api/admin/drivers/available?orderId={order_id}' "
        f"-H 'Authorization: Bearer {tok}'",
    )
    try:
        avp = json.loads(av)
        drivers = avp.get("data", {}).get("drivers") or avp.get("data", {}).get("items") or []
        print(json.dumps({
            "total": len(drivers),
            "phones": [d.get("phone") for d in drivers[:10]],
            "ids": [str(d.get("_id") or d.get("userId") or "") for d in drivers[:10]],
        }, ensure_ascii=False, indent=2))
    except Exception as ex:
        print(av[:2000])
        print("parse err", ex)

    c.close()


if __name__ == "__main__":
    main()
