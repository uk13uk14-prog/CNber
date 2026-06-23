#!/usr/bin/env bash
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="/Users/agent001/Desktop/CNber"
cd "$ROOT"

echo "===== check dirs ====="
ls CNber_admin_web_v1.0
ls CNber_backend/public || true

echo "===== build admin ====="
cd CNber_admin_web_v1.0
npm install
npm run build

echo "===== verify dist ====="
test -f dist/index.html
ls dist

echo "===== sync admin ====="
mkdir -p ../CNber_backend/public/admin
rm -rf ../CNber_backend/public/admin/*
cp -R dist/* ../CNber_backend/public/admin/

echo "===== verify public/admin ====="
test -f ../CNber_backend/public/admin/index.html
ls ../CNber_backend/public/admin

echo "===== restart backend ====="
cd ../CNber_backend
pm2 restart cnber-backend --update-env 2>/dev/null || pm2 start server.js --name cnber-backend --update-env
pm2 save

echo "===== HTTP checks ====="
sleep 2
curl -I http://192.168.1.187:3100/admin/
curl -s http://192.168.1.187:3100/api/status
curl -s http://192.168.1.187:3100/api/payment/accounts

echo "===== admin route grep ====="
grep -R "payment-settings" public/admin/assets 2>/dev/null | head -3 || true

echo "===== driver data ensure ====="
node scripts/seedTestDriver.js || true
pm2 restart cnber-backend --update-env

echo "===== driver available check ====="
sleep 3
node scripts/_m1_check_available.js

echo "===== final ====="
pm2 list
curl -I http://192.168.1.187:3100/admin/
echo "DONE"
