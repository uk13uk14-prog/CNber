#!/bin/bash
set -e
BASE="http://127.0.0.1:3100/api"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"phone":"13800000000","password":"Admin123456"}')
echo "LOGIN:$LOGIN"
TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['data']['token'])" "$LOGIN")
ROLE=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['data']['user']['role'])" "$LOGIN")
echo "ROLE:$ROLE"
for path in \
  "/admin/mobile/dashboard" \
  "/admin/orders?range=14d&page=1&pageSize=100" \
  "/admin/support-tickets?page=1&pageSize=20" \
  "/admin/me/permissions"
do
  echo "--- GET $path ---"
  curl -s -w "\nHTTP_STATUS:%{http_code}\n" -H "Authorization: Bearer $TOKEN" "$BASE$path"
  echo
done
