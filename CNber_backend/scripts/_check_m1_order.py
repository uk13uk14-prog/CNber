#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.187',username='agent001',password='121212')
files=[
 'routes/order.js',
 'controllers/orderPaymentController.js',
 'utils/paymentProofUpload.js',
]
base='/Users/agent001/Desktop/CNber/CNber_backend/'
for f in files:
 _,o,_=c.exec_command(f'wc -l {base}{f} 2>&1; grep -c payment-proof {base}{f} 2>/dev/null || echo 0')
 print(f, o.read().decode().strip())
c.close()
