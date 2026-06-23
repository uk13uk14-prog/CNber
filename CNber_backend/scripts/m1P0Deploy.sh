#!/usr/bin/env bash
# CNber M1 P0 真机测试一键部署（admin 支付模块 + PaymentAccount 种子 + 构建同步）
# 在 M1 上执行：cd ~/Desktop/CNber && bash CNber_backend/scripts/m1P0Deploy.sh
set -euo pipefail

# 非交互 SSH 默认 PATH 不含 Homebrew，需显式加载
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"
for _profile in "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.bash_profile"; do
  [[ -f "$_profile" ]] && source "$_profile" 2>/dev/null || true
done
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"
command -v node >/dev/null || { echo "ERROR: node not found in PATH"; exit 127; }
command -v npm >/dev/null || { echo "ERROR: npm not found in PATH"; exit 127; }

CNBER="${CNBER:-$HOME/Desktop/CNber}"
ADMIN="$CNBER/CNber_admin_web_v1.0"
BACKEND="$CNBER/CNber_backend"
BUNDLE="$BACKEND/scripts/m1-p0-bundle"
HOST="${CNBER_HOST:-192.168.1.187}"
PORT="${CNBER_PORT:-3100}"
TS="$(date +%Y%m%d_%H%M%S)"

echo "===== CNber M1 P0 Deploy ====="
echo "CNBER=$CNBER"
echo "HOST=$HOST:$PORT"
echo ""

if [[ ! -d "$CNBER" ]]; then
  echo "ERROR: 项目目录不存在: $CNBER"
  exit 1
fi

echo "===== 1. 备份 ====="
cp -R "$ADMIN" "${ADMIN}.backup_${TS}"
cp -R "$BACKEND" "${BACKEND}.backup_${TS}"
echo "  backup admin  -> ${ADMIN}.backup_${TS}"
echo "  backup backend -> ${BACKEND}.backup_${TS}"

echo ""
echo "===== 2. 现状检查 ====="
pwd
( cd "$CNBER" && git status -sb ) 2>/dev/null || true
echo "--- admin payment grep ---"
grep -R "payment-settings\|支付设置\|PaymentSettings" -n "$ADMIN/src" 2>/dev/null || echo "(none in current admin src)"
echo "--- payment accounts API ---"
curl -s "http://${HOST}:${PORT}/api/payment/accounts" || true
echo ""

echo "===== 3. 从 bundle 同步 P0 文件 ====="
if [[ ! -d "$BUNDLE" ]]; then
  echo "ERROR: bundle 不存在: $BUNDLE"
  echo "请先从开发机同步整个 CNber 仓库（含 scripts/m1-p0-bundle）"
  exit 1
fi

mkdir -p "$ADMIN/src/views" "$ADMIN/src/router" "$ADMIN/src/layouts" "$ADMIN/src/api" "$ADMIN/src/utils"
mkdir -p "$BACKEND/scripts" "$BACKEND/models" "$BACKEND/controllers"

cp -f "$BUNDLE/admin_web/src/views/"*.vue "$ADMIN/src/views/"
cp -f "$BUNDLE/admin_web/src/router/index.js" "$ADMIN/src/router/index.js"
cp -f "$BUNDLE/admin_web/src/layouts/MainLayout.vue" "$ADMIN/src/layouts/MainLayout.vue"
cp -f "$BUNDLE/admin_web/src/api/admin.js" "$ADMIN/src/api/admin.js"
cp -f "$BUNDLE/admin_web/src/utils/paymentDisplay.js" "$ADMIN/src/utils/paymentDisplay.js"
cp -f "$BUNDLE/admin_web/src/utils/p0Labels.js" "$ADMIN/src/utils/p0Labels.js"

cp -f "$BUNDLE/backend/scripts/seedPaymentAccounts.js" "$BACKEND/scripts/seedPaymentAccounts.js"
cp -f "$BUNDLE/backend/models/PaymentAccount.js" "$BACKEND/models/PaymentAccount.js"
cp -f "$BUNDLE/backend/controllers/paymentAccountController.js" "$BACKEND/controllers/paymentAccountController.js"
cp -f "$BUNDLE/backend/controllers/paymentPublicController.js" "$BACKEND/controllers/paymentPublicController.js"

echo "  synced admin + backend payment files from bundle"

echo ""
echo "===== 3b. 确保 server.js 提供 /uploads 静态目录 ====="
SERVER_JS="$BACKEND/server.js"
UPLOADS_LINE="app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))"
if ! grep -Fq "$UPLOADS_LINE" "$SERVER_JS" 2>/dev/null; then
  export SERVER_JS
  python3 - <<'PY'
from pathlib import Path
p = Path(__import__("os").environ["SERVER_JS"])
text = p.read_text(encoding="utf-8")
line = "app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))"
if line not in text:
    needle = "app.use(express.json"
    i = text.find(needle)
    if i == -1:
        raise SystemExit("express.json line not found in server.js")
    j = text.find("\n", i) + 1
    text = text[:j] + line + "\n" + text[j:]
    p.write_text(text, encoding="utf-8")
    print("  patched server.js uploads route")
PY
else
  echo "  uploads route already present"
fi

echo ""
echo "===== 4. Admin build ====="
cd "$ADMIN"
npm install
npm run build

echo ""
echo "===== 5. 同步 public/admin ====="
rm -rf "$BACKEND/public/admin/"*
cp -R "$ADMIN/dist/"* "$BACKEND/public/admin/"
echo "  copied dist -> public/admin"

echo ""
echo "===== 6. 种子数据 + uploads 目录 ====="
mkdir -p "$BACKEND/public/uploads/payment-accounts"
cd "$BACKEND"
node scripts/seedPaymentAccounts.js

# 若无收款码图片，写入最小占位 JPEG 便于联调（请后续替换为真实二维码）
for qr in wechat-qr.jpg alipay-qr.jpg; do
  if [[ ! -s "$BACKEND/public/uploads/payment-accounts/$qr" ]]; then
    python3 - <<PY
import base64, pathlib
b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
pathlib.Path("$BACKEND/public/uploads/payment-accounts/$qr").write_bytes(base64.b64decode(b64))
print("  placeholder $qr")
PY
  fi
done

echo ""
echo "===== 7. 重启 PM2 ====="
pm2 restart cnber-backend --update-env || pm2 start server.js --name cnber-backend --update-env
pm2 save || true
sleep 2
pm2 list

echo ""
echo "===== 8. 验证 ====="
curl -s -o /dev/null -w "admin HTTP %{http_code}\n" "http://${HOST}:${PORT}/admin/"
curl -s "http://${HOST}:${PORT}/api/status"
echo ""
curl -s "http://${HOST}:${PORT}/api/payment/accounts"
echo ""
grep -R "payment-settings\|支付设置\|payment-reviews\|支付审核" -n "$BACKEND/public/admin/assets" 2>/dev/null | head -5 || true

echo ""
echo ">>> M1 P0 DEPLOY DONE"
echo "请浏览器打开: http://${HOST}:${PORT}/admin/payment-settings"
echo "请手动放置收款码图片:"
echo "  $BACKEND/public/uploads/payment-accounts/wechat-qr.jpg"
echo "  $BACKEND/public/uploads/payment-accounts/alipay-qr.jpg"
