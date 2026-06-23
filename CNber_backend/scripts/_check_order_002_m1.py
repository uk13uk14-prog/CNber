#!/usr/bin/env python3
import json, os, sys, paramiko
HOST, USER, PW = "192.168.1.187", "agent001", "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
JS = r"""
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow');
(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber');
  const o = await Order.findOne({ orderNo: 'CNB-20260622-002' }).lean();
  if (!o) { console.log('NOT_FOUND'); process.exit(1); }
  console.log(JSON.stringify({
    orderNo: o.orderNo, _id: String(o._id), status: o.status,
    depositStatus: o.depositStatus, paymentStage: o.paymentStage,
    paymentStatus: o.paymentStatus, depositPaid: o.depositPaid,
    priceStatus: o.priceStatus, driverId: o.driverId, assignedDriver: o.assignedDriver,
    pickupDetail: o.pickupDetail, dropoffDetail: o.dropoffDetail,
    payment: o.payment, canDispatchByDeposit: canDispatchByDeposit(o)
  }, null, 2));
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
"""
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy()); c.connect(HOST, username=USER, password=PW, timeout=30)
sftp = c.open_sftp()
with sftp.open(f"{ROOT}/scripts/_chk_002.js", "wb") as f: f.write(JS.encode())
sftp.close()
_, o, _ = c.exec_command(f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; cd {ROOT} && node scripts/_chk_002.js", timeout=60)
print(o.read().decode('utf-8', errors='replace'))
c.close()
