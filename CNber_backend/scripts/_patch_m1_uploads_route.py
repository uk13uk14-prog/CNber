#!/usr/bin/env python3
"""Patch M1 server.js to serve /uploads static files."""
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
SERVER = "/Users/agent001/Desktop/CNber/CNber_backend/server.js"
UPLOADS_LINE = "app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))"


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    with sftp.open(SERVER, "r") as f:
        content = f.read().decode("utf-8", errors="replace")

    if UPLOADS_LINE in content:
        print("uploads route already present")
    else:
        needle = "app.use(express.json"
        idx = content.find(needle)
        if idx == -1:
            raise SystemExit("cannot find express.json line in server.js")
        line_end = content.find("\n", idx)
        insert_at = line_end + 1
        content = content[:insert_at] + UPLOADS_LINE + "\n" + content[insert_at:]
        with sftp.open(SERVER, "w") as f:
            f.write(content.encode("utf-8"))
        print("patched server.js with /uploads static route")

    sftp.close()
    cmd = (
        "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && "
        "cd /Users/agent001/Desktop/CNber/CNber_backend && "
        "pm2 restart cnber-backend --update-env && sleep 2 && "
        "curl -s -o /dev/null -w 'wechat_qr HTTP %{http_code}\\n' "
        "http://192.168.1.187:3100/uploads/payment-accounts/wechat-qr.jpg"
    )
    _, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err)
    client.close()


if __name__ == "__main__":
    main()
