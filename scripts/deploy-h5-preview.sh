#!/usr/bin/env bash
# Deploy CNber H5 Preview builds to Cloudflare Workers Static Assets.
# Requires: wrangler, CLOUDFLARE_API_TOKEN (+ ACCOUNT) for durable deploys,
# or pass --temporary for a short-lived preview account.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WR="${WRANGLER_BIN:-npx wrangler}"
MODE="${1:---temporary}"
COMPAT=2026-09-03

deploy() {
  local name=$1
  local dir=$2
  echo "===== $name ($dir) ====="
  (cd "$dir" && $WR deploy --name "$name" --compatibility-date "$COMPAT" --assets=. $MODE)
}

deploy cnber-client-preview "$ROOT/CNber_client_admin_v1.0/dist/build/h5"
deploy cnber-driver-preview "$ROOT/CNber_driver_admin_v1.0/dist/build/h5"
deploy cnber-admin-preview "$ROOT/CNber_admin_web_v1.0/dist"
deploy cnber-preview-portal "$ROOT/cnber-h5-preview-portal"
