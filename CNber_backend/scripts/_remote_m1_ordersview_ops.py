#!/usr/bin/env python3
import os, sys, paramiko
HOST, USER, PW = "192.168.1.187", "agent001", "121212"
ROOT = "/Users/agent001/Desktop/CNber"
LOCAL = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../CNber_admin_web_v1.0"))

def put_lf(sftp, local, remote):
    with open(local, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote, "wb") as rf:
        rf.write(data)

def run(c, cmd):
    _, o, e = c.exec_command(f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}", timeout=300)
    return o.channel.recv_exit_status(), o.read().decode("utf-8", errors="replace"), e.read().decode("utf-8", errors="replace")

def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy()); c.connect(HOST, username=USER, password=PW, timeout=30)
    sftp = c.open_sftp()
    for rel in ["src/views/OrdersView.vue", "src/utils/bookingStatus.js"]:
        put_lf(sftp, os.path.join(LOCAL, rel), f"{ROOT}/CNber_admin_web_v1.0/{rel}")
    sftp.close()
    for step in [
        f"cd {ROOT}/CNber_admin_web_v1.0 && npm run build",
        f"mkdir -p {ROOT}/CNber_backend/public/admin && rm -rf {ROOT}/CNber_backend/public/admin/*",
        f"cp -R {ROOT}/CNber_admin_web_v1.0/dist/* {ROOT}/CNber_backend/public/admin/",
        f"test -f {ROOT}/CNber_backend/public/admin/index.html",
    ]:
        print(">>>", step)
        code, out, err = run(c, step)
        if out.strip(): print(out[-2500:])
        if code != 0:
            print(err); c.close(); sys.exit(code)
    _, out, _ = run(c, f"grep -o '待客户付款' {ROOT}/CNber_backend/public/admin/assets/OrdersView*.js | head -1")
    print("bundle:", out.strip() or "NOT FOUND")
    _, out, _ = run(c, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/admin/")
    print("/admin HTTP", out.strip())
    c.close()

if __name__ == "__main__":
    main()
