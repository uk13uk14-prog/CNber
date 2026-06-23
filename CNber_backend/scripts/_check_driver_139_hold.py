#!/usr/bin/env python3
"""Check driver 13900000001 occupancy on M1."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
DRIVER_PHONE = "13900000001"
FOCUS = ["CNB-20260621-003", "CNB-20260621-005"]

JS = r"""
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Driver = require('../models/Driver');

const ACTIVE = [
  'assigned', 'accepted', 'driver_accepted',
  'ready_to_start', 'started', 'in_progress', 'arrived'
];

function idStr(v) {
  if (!v) return '';
  if (typeof v === 'object' && v._id) return String(v._id);
  return String(v);
}

function isTestOrder(o) {
  const tags = [];
  const pickup = String(o.pickup || '').toLowerCase();
  const dest = String(o.destination || '').toLowerCase();
  const note = JSON.stringify(o).toLowerCase();
  if (/p0|测试|test|m1|smoke|e2e/.test(note)) tags.push('keyword_match');
  if (/ealing|wandsworth|london/.test(pickup) && /london/.test(dest)) tags.push('london_test_route');
  if (String(o.userId?.phone || '').startsWith('1390000000')) tags.push('test_user_phone');
  if (String(o.assignedDriverPhone || '').startsWith('1390000000')) tags.push('test_driver_phone');
  return { likelyTest: tags.length > 0, tags };
}

function canUnassignUi(o) {
  const reasons = [];
  if (o.status === 'assigned') {
    reasons.push('status=assigned，Admin 订单列表/详情可用「取消派单」或 unassign-driver');
    return { yes: true, reasons };
  }
  if (['driver_accepted', 'ready_to_start', 'started', 'in_progress', 'arrived'].includes(o.status)) {
    reasons.push(`status=${o.status}，需先撤销指派或运营结案，UI 可能受限`);
    return { yes: false, reasons };
  }
  if (o.status === 'accepted') {
    reasons.push('status=accepted（旧状态），需查 Admin 是否支持 unassign');
    return { yes: 'maybe', reasons };
  }
  reasons.push(`status=${o.status}，一般不在 active 占用集合`);
  return { yes: false, reasons };
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber');
  const driverUser = await User.findOne({ phone: DRIVER_PHONE, role: 'driver' }).lean();
  const driverDoc = await Driver.findOne({ phone: DRIVER_PHONE }).lean();

  const uid = driverUser ? String(driverUser._id) : '';
  const did = driverDoc ? String(driverDoc._id) : '';

  const holding = await Order.find({
    $or: [
      { driverId: uid },
      { assignedDriver: uid },
      ...(did ? [{ driverId: did }, { assignedDriver: did }] : []),
      { assignedDriverPhone: DRIVER_PHONE }
    ],
    status: { $in: ACTIVE }
  })
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role')
    .sort({ createdAt: -1 })
    .lean();

  const focusOrders = await Order.find({ orderNo: { $in: FOCUS } })
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role')
    .lean();

  const fmt = (o) => {
    const test = isTestOrder(o);
    const unassign = canUnassignUi(o);
    return {
      orderNo: o.orderNo,
      _id: String(o._id),
      status: o.status,
      dispatchStatus: o.dispatchStatus,
      driverId: idStr(o.driverId) || null,
      driverIdPhone: o.driverId?.phone || null,
      assignedDriver: idStr(o.assignedDriver) || null,
      assignedDriverPhone: o.assignedDriverPhone || o.assignedDriver?.phone || null,
      depositStatus: o.depositStatus,
      paymentStage: o.paymentStage,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      customerPhone: o.userId?.phone || null,
      likelyTestOrder: test.likelyTest,
      testSignals: test.tags,
      canUnassignViaUi: unassign.yes,
      unassignNotes: unassign.reasons,
      inActiveHoldingSet: ACTIVE.includes(o.status)
    };
  };

  console.log(JSON.stringify({
    driver: {
      phone: DRIVER_PHONE,
      userId: uid,
      driverDocId: did,
      userStatus: driverUser?.status,
      driverProfileStatus: driverUser?.driverProfile?.status
    },
    activeStatusesCounted: ACTIVE,
    allActiveHoldings: holding.map(fmt),
    focusOrders: focusOrders.map(fmt),
    summary: {
      activeHoldCount: holding.length,
      activeOrderNos: holding.map((o) => o.orderNo),
      focusInActive: focusOrders.filter((o) => ACTIVE.includes(o.status)).map((o) => o.orderNo)
    }
  }, null, 2));

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
""".replace("DRIVER_PHONE", repr(DRIVER_PHONE)).replace("FOCUS", json.dumps(FOCUS))


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = c.open_sftp()
    remote = f"{ROOT}/scripts/_check_driver_139_hold.js"
    with sftp.open(remote, "wb") as rf:
        rf.write(JS.encode("utf-8"))
    sftp.close()

    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT} && node scripts/_check_driver_139_hold.js",
        timeout=60,
    )
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err, file=sys.stderr)
    c.close()


if __name__ == "__main__":
    main()
