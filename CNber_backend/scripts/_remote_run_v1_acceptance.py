#!/usr/bin/env python3
"""Run V1 acceptance verify on M1."""
import sys
import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
REMOTE = "/Users/agent001/Desktop/CNber/CNber_backend"


def run(client, cmd, timeout=180):
    print(f"\n$ {cmd[:180]}")
    _, stdout, stderr = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        get_pty=True,
        timeout=timeout,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print("STDERR:", err.rstrip())
    return stdout.channel.recv_exit_status(), out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    with open(
        __file__.replace("_remote_run_v1_acceptance.py", "_v1_trial_acceptance_verify.js"),
        "r",
        encoding="utf-8",
    ) as f:
        verify_js = f.read()

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()
    with sftp.open(f"{REMOTE}/scripts/_v1_trial_acceptance_verify.js", "w") as f:
        f.write(verify_js.replace("\r\n", "\n"))
    sftp.close()

    run(c, f"cd {REMOTE} && node scripts/smoke_scheduled_pickup.js")
    run(c, f"cd {REMOTE} && node scripts/smoke_order_coupon.js")
    run(c, f"cd {REMOTE} && node scripts/smoke_support_tickets.js")
    run(c, f"cd {REMOTE} && node scripts/smoke_profiles.js")
    run(c, f"cd {REMOTE} && node scripts/smoke_crm.js")
    code, out = run(c, f"cd {REMOTE} && node scripts/_v1_trial_acceptance_verify.js")
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
