#!/usr/bin/env python3
"""Upload placeholder payment QR images to M1."""
import base64
import os
import stat

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE_DIR = "/Users/agent001/Desktop/CNber/CNber_backend/public/uploads/payment-accounts"

# 最小有效 JPEG（1x1 灰点），仅用于 P0 联调占位
MIN_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
    "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN"
    "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
    "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAU"
    "EAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAA"
    "AAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
)
JPEG_BYTES = base64.b64decode(MIN_JPEG_B64)


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    try:
        sftp.stat(REMOTE_DIR)
    except OSError:
        parts = REMOTE_DIR.strip("/").split("/")
        cur = ""
        for p in parts:
            cur = f"{cur}/{p}" if cur else f"/{p}"
            try:
                sftp.stat(cur)
            except OSError:
                sftp.mkdir(cur)

    for name in ("wechat-qr.jpg", "alipay-qr.jpg"):
        remote = f"{REMOTE_DIR}/{name}"
        with sftp.open(remote, "wb") as rf:
            rf.write(JPEG_BYTES)
        sftp.chmod(remote, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        print(f"uploaded {remote}")

    for url in (
        "http://192.168.1.187:3100/uploads/payment-accounts/wechat-qr.jpg",
        "http://192.168.1.187:3100/uploads/payment-accounts/alipay-qr.jpg",
    ):
        _, stdout, _ = client.exec_command(f'curl -s -o /dev/null -w "%{{http_code}}" {url}')
        print(f"{url} -> HTTP {stdout.read().decode().strip()}")

    sftp.close()
    client.close()


if __name__ == "__main__":
    main()
