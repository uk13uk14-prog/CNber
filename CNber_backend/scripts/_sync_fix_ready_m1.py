#!/usr/bin/env python3
"""Upload fix_ready scripts to M1 and run preview + apply + dryrun."""
import os
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
ROOT = "/Users/agent001/Desktop/CNber/CNber_backend"
LOCAL_SCRIPTS = os.path.join(os.path.dirname(__file__))

FILES = [
    "fix_ready_to_start_without_driver_apply.js",
    "fix_ready_to_start_without_driver_lib.js",
    "fix_ready_to_start_without_driver_dryrun.js",
]


def put_lf(sftp, local_path, remote_path):
    with open(local_path, "rb") as f:
        data = f.read().replace(b"\r\n", b"\n")
    with sftp.open(remote_path, "wb") as rf:
        rf.write(data)


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
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = c.open_sftp()
    for name in FILES:
        local = os.path.join(LOCAL_SCRIPTS, name)
        remote = f"{ROOT}/scripts/{name}"
        put_lf(sftp, local, remote)
        print(f"Uploaded {name}")
    sftp.close()

    steps = [
        f"cd {ROOT} && ls -lh scripts | grep fix_ready",
        f"cd {ROOT} && node scripts/fix_ready_to_start_without_driver_apply.js",
        f"cd {ROOT} && APPLY=1 node scripts/fix_ready_to_start_without_driver_apply.js",
        f"cd {ROOT} && node scripts/fix_ready_to_start_without_driver_dryrun.js",
    ]
    for cmd in steps:
        print("\n" + "=" * 60)
        print(">>>", cmd)
        code, out, err = run(c, cmd, timeout=120)
        if out.strip():
            print(out)
        if err.strip():
            print("STDERR:", err)
        if code != 0:
            print(f"EXIT {code}")
            c.close()
            raise SystemExit(code)

    c.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
