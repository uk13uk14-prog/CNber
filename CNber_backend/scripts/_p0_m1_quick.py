#!/usr/bin/env python3
import json, paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.187',username='agent001',password='121212')
def run(cmd):
 _,o,e=c.exec_command('export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; '+cmd)
 return o.read().decode('utf-8','replace').strip(), e.read().decode('utf-8','replace').strip()
login=json.loads(run("curl -s -X POST http://127.0.0.1:3100/api/auth/login -H 'Content-Type: application/json' -d '{\"phone\":\"13800000000\",\"password\":\"Admin123456\"}'")[0])
tok=login['data']['token']
paths=[
 ('dashboard','/api/admin/dashboard'),
 ('orders','/api/admin/orders?page=1&pageSize=5'),
 ('drivers','/api/admin/drivers?page=1&pageSize=5'),
 ('onboarding','/api/admin/drivers/onboarding?page=1&pageSize=5'),
 ('customers','/api/admin/customers?page=1&pageSize=5'),
 ('payment-accounts','/api/admin/payment-accounts'),
 ('payment-reviews','/api/admin/payment-reviews?stage=pending&page=1&pageSize=5'),
 ('finance-summary','/api/admin/finance/summary'),
 ('finance-tx','/api/admin/finance/transactions?page=1&pageSize=5'),
 ('finance-settle','/api/admin/finance/driver-settlements?page=1&pageSize=5'),
 ('finance-recon','/api/admin/finance/reconciliation?page=1&pageSize=5'),
 ('pricing','/api/admin/pricing-rules'),
]
for name,path in paths:
 url=f'http://127.0.0.1:3100{path}'
 code,err=run(f"curl -s -o /tmp/r.json -w '%{{http_code}}' '{url}' -H 'Authorization: Bearer {tok}'")
 body,=run('head -c 120 /tmp/r.json')
 msg=''
 try: msg=json.loads(run('cat /tmp/r.json')[0]).get('message','')
 except: pass
 print(f'{name:18} HTTP {code} code={msg or body[:80]}')
c.close()
