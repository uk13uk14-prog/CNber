#!/usr/bin/env python3
"""Sync passenger payment upload routes to M1."""
import json
import os
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_BACKEND = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SYNC_FILES = [
    "routes/order.js",
    "controllers/orderPaymentController.js",
    "utils/paymentProofUpload.js",
]


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


def run(client, cmd):
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}"
    )
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return stdout.channel.recv_exit_status(), out, err


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    for rel in SYNC_FILES:
        local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BACKEND}/{rel}"
        put_lf(sftp, local_path, remote_path)
        print(f"uploaded {rel}")
    sftp.close()

    # ensure payment-proofs dir + PUBLIC_BASE_URL
    run(client, f"mkdir -p {REMOTE_BACKEND}/public/uploads/payment-proofs")
    _, env_out, _ = run(client, f"grep -q PUBLIC_BASE_URL {REMOTE_BACKEND}/.env 2>/dev/null && echo has || echo missing")
    if "missing" in env_out or not env_out:
        run(
            client,
            f"grep -q PUBLIC_BASE_URL {REMOTE_BACKEND}/.env 2>/dev/null || "
            f"echo 'PUBLIC_BASE_URL=http://192.168.1.187:3100' >> {REMOTE_BACKEND}/.env",
        )
        print("appended PUBLIC_BASE_URL to .env")

    run(client, f"cd {REMOTE_BACKEND} && pm2 restart cnber-backend --update-env && sleep 2")
    print("pm2 restarted")

    # verify route exists
    _, grep_out, _ = run(client, f"grep payment-proof {REMOTE_BACKEND}/routes/order.js")
    print("route:", grep_out)

    # quick upload test
    login_payload = json.dumps({"phone": "13800000000", "password": "Admin123456"})
    _, login_out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' -d '{login_payload}'",
    )
    # register temp user and test upload
    import time

    phone = f"1399000{int(time.time()) % 10000:04d}"
    run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/register "
        f"-H 'Content-Type: application/json' "
        f"-d '{{\"phone\":\"{phone}\",\"password\":\"Test123456\",\"role\":\"user\"}}'",
    )
    _, login2, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/auth/login "
        f"-H 'Content-Type: application/json' "
        f"-d '{{\"phone\":\"{phone}\",\"password\":\"Test123456\"}}'",
    )
    tok = json.loads(login2)["data"]["token"]
    _, create_out, _ = run(
        client,
        f"curl -s -X POST http://127.0.0.1:3100/api/order/create "
        f"-H 'Content-Type: application/json' -H 'Authorization: Bearer {tok}' "
        f"-d '{{\"pickup\":\"A\",\"destination\":\"B\",\"serviceType\":\"pickup\"}}'",
    )
    oid = json.loads(create_out)["data"]["order"]["_id"]
    b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
    payload = json.dumps({"imageBase64": b64}).replace("'", "'\\''")
    _, up_out, _ = run(
        client,
        f"curl -s -o /tmp/up.json -w '%{{http_code}}' -X POST "
        f"http://127.0.0.1:3100/api/order/{oid}/payment-proof/upload "
        f"-H 'Content-Type: application/json' -H 'Authorization: Bearer {tok}' "
        f"-d '{payload}'",
    )
    http_code = up_out.strip()
    _, body, _ = run(client, "cat /tmp/up.json")
    print(f"upload test HTTP {http_code} body={body[:120]}")
    client.close()


if __name__ == "__main__":
    main()
