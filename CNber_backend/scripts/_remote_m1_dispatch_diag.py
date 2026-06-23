#!/usr/bin/env python3
"""M1 P0 dispatch diagnosis."""
import json
import os
import sys
import time

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"

NODE_DB = r"""
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Driver = require('./models/Driver')
const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

;(async () => {
  await mongoose.connect(mongoUrl)
  const users = await User.find({ role: 'driver' }).lean()
  const drivers = await Driver.find({}).lean()
  console.log('Users driver count=', users.length)
  users.forEach(u => console.log(JSON.stringify({
    id: String(u._id),
    phone: u.phone,
    role: u.role,
    status: u.status,
    isActive: u.isActive,
    driverProfile: u.driverProfile
  })))
  console.log('Driver count=', drivers.length)
  drivers.forEach(d => console.log(JSON.stringify({
    id: String(d._id),
    userId: d.userId ? String(d.userId) : null,
    status: d.status,
    verificationStatus: d.verificationStatus,
    isActive: d.isActive,
    available: d.available,
    serviceStatus: d.serviceStatus,
    carPlate: d.carPlate
  })))
  await mongoose.disconnect()
})().catch(e => { console.error(e); process.exit(1) })
"""


def run(c, cmd, timeout=120):
    _, o, e = c.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=timeout,
    )
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    return code, out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    print("===== 1. PM2 =====")
    _, out, _ = run(c, "pm2 list")
    print(out)

    print("===== 2. available / for-dispatch / drivers =====")
    login_body = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, login_out, _ = run(
        c,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_body}'",
    )
    tok = json.loads(login_out)["data"]["token"]
    print("ADMIN TOKEN OK")

    for label, path in [
        ("available", "/api/admin/drivers/available"),
        ("for-dispatch", "/api/admin/drivers/for-dispatch"),
        ("all", "/api/admin/drivers?page=1&pageSize=20"),
    ]:
        _, body, _ = run(
            c,
            f"curl -s 'http://127.0.0.1:3100{path}' "
            f"-H 'Authorization: Bearer {tok}'",
        )
        print(f"\n--- {label} ---")
        try:
            parsed = json.loads(body)
            print(json.dumps(parsed, ensure_ascii=False, indent=2)[:4000])
        except json.JSONDecodeError:
            print(body[:2000])

    print("\n===== 3. Driver/User DB =====")
    remote_node = f"cd {BACKEND} && node -e {json.dumps(NODE_DB)}"
    _, out, err = run(c, remote_node, timeout=60)
    print(out)
    if err.strip():
        print("stderr:", err[:500])

    print("\n===== 4. deployed admin bundle grep =====")
    _, out, _ = run(
        c,
        f"grep -o 'drivers/available[^\"]*' {BACKEND}/public/admin/assets/*.js 2>/dev/null | head -5",
    )
    print(out or "(no match)")

    _, out, _ = run(
        c,
        f"grep -o 'fetchAvailableDrivers\\|loadDrivers\\|availableDrivers' {BACKEND}/public/admin/assets/OrdersView*.js 2>/dev/null | sort -u",
    )
    print("OrdersView bundle symbols:", out)

    c.close()


if __name__ == "__main__":
    main()
