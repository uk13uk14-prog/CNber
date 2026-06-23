#!/usr/bin/env python3
"""Check M1 driver data in MongoDB."""
import paramiko
import sys

SCRIPT = r"""
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
let Driver = null
try { Driver = require('./models/Driver') } catch (e) {}
const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

;(async () => {
  await mongoose.connect(mongoUrl)

  console.log('===== Users role=driver =====')
  const users = await User.find({ role: 'driver' }).lean()
  console.log('count=', users.length)
  for (const u of users) {
    console.log(JSON.stringify({
      id: String(u._id),
      phone: u.phone,
      role: u.role,
      status: u.status,
      driverProfile: u.driverProfile
    }))
  }

  if (Driver) {
    console.log('===== Driver collection =====')
    const drivers = await Driver.find({}).lean()
    console.log('count=', drivers.length)
    for (const d of drivers) {
      console.log(JSON.stringify({
        id: String(d._id),
        userId: d.userId ? String(d.userId) : null,
        verificationStatus: d.verificationStatus,
        status: d.status,
        isActive: d.isActive,
        vehiclePlate: d.vehiclePlate,
        carPlate: d.carPlate
      }))
    }
  }

  await mongoose.disconnect()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
"""

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"

def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        "cd /Users/agent001/Desktop/CNber/CNber_backend && "
        f"node -e {repr(SCRIPT)}"
    )
    # use heredoc via bash instead
    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        "cd /Users/agent001/Desktop/CNber/CNber_backend && "
        "node scripts/_check_drivers_tmp.js"
    )
    sftp = c.open_sftp()
    with sftp.open("/Users/agent001/Desktop/CNber/CNber_backend/scripts/_check_drivers_tmp.js", "w") as f:
        f.write(SCRIPT.replace("\r\n", "\n"))
    sftp.close()
    _, o, e = c.exec_command(cmd)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err)
    c.close()

if __name__ == "__main__":
    main()
