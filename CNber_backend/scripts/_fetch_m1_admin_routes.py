#!/usr/bin/env python3
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
OUT = r"C:\Users\eulan\.cursor\projects\c-Users-eulan-Documents-HBuilderProjects-CNber\agent-tools\m1-admin-routes.js"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
_, stdout, _ = client.exec_command(
    "cat /Users/agent001/Desktop/CNber/CNber_backend/routes/admin.js"
)
open(OUT, "w", encoding="utf-8").write(stdout.read().decode("utf-8", errors="replace"))
client.close()
print(OUT)
