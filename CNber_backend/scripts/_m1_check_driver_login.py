#!/usr/bin/env python3
"""M1: verify test driver user + curl login."""
import json
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.187"
USER = "agent001"
PASS = "121212"
BACKEND = "~/Desktop/CNber/CNber_backend"

NODE_CHECK = r"""
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

;(async () => {
  await mongoose.connect(mongoUrl)
  const u = await User.findOne({ phone: '13900000001' }).lean()
  console.log(JSON.stringify({
    exists: !!u,
    id: u && String(u._id),
    phone: u && u.phone,
    role: u && u.role,
    status: u && u.status,
    isActive: u && u.isActive,
    hasPassword: !!(u && u.password),
    driverProfile: u && u.driverProfile
  }))
  if (u && u.password) {
    console.log('passwordMatch=' + (await bcrypt.compare('123456', u.password)))
  }
  await mongoose.disconnect()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
"""

def run(client, cmd):
    _, stdout, stderr = client.exec_command(
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; " + cmd
    )
    out = stdout.read().decode("utf-8", "replace").strip()
    err = stderr.read().decode("utf-8", "replace").strip()
    return out, err


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS)

    print("=== DB check ===")
    out, err = run(
        c,
        f"cd {BACKEND} && node -e \"{NODE_CHECK.replace(chr(10), ' ')}\"",
    )
    print(out)
    if err:
        print("stderr:", err)

    print("\n=== curl login (127.0.0.1) ===")
    out, _ = run(
        c,
        "curl -s -w '\\nHTTP:%{http_code}' -X POST http://127.0.0.1:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13900000001\",\"password\":\"123456\"}'",
    )
    print(out)

    print("\n=== curl login (192.168.1.187) ===")
    out, _ = run(
        c,
        "curl -s -w '\\nHTTP:%{http_code}' -X POST http://192.168.1.187:3100/api/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"phone\":\"13900000001\",\"password\":\"123456\"}'",
    )
    print(out)

    c.close()


if __name__ == "__main__":
    main()
