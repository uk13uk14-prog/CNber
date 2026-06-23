#!/usr/bin/env python3
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"


def run(client, cmd):
    _, o, e = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=30
    )
    return (o.read() + e.read()).decode("utf-8", "replace")


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    for cmd in [
        "lsof -iTCP -sTCP:LISTEN -n -P | grep node || netstat -an | grep LISTEN | grep 300",
        "pm2 show cnber-backend | head -30",
        "tail -20 ~/Desktop/CNber/CNber_backend/.env 2>/dev/null | grep PORT",
        "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo fail3000",
        "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ || echo fail8080",
    ]:
        print(f"\n$ {cmd}\n{run(client, cmd)}")
    client.close()


if __name__ == "__main__":
    main()
