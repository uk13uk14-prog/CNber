#!/usr/bin/env bash
# Deploy CNber H5 Mobile Preview builds to Cloudflare Workers Static Assets.
# CNber-only worker names. Do not reuse other project Workers/Pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WR="${WRANGLER_BIN:-npx wrangler}"
MODE="${1:---temporary}"
COMPAT=2026-09-03
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
HEAD="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

deploy() {
  local name=$1
  local dir=$2
  echo "===== $name ($dir) ====="
  (cd "$dir" && $WR deploy --name "$name" --compatibility-date "$COMPAT" --assets=. $MODE)
}

deploy cnber-client-preview "$ROOT/CNber_client_admin_v1.0/dist/build/h5"
deploy cnber-driver-preview "$ROOT/CNber_driver_admin_v1.0/dist/build/h5"
deploy cnber-admin-preview "$ROOT/CNber_admin_web_v1.0/dist"

# Portal URLs filled after deploy; placeholders replaced if env provided
PORTAL_SRC="$ROOT/cnber-h5-preview-portal/index.html"
PORTAL_OUT="$ROOT/cnber-h5-preview-portal/dist"
mkdir -p "$PORTAL_OUT"
CLIENT_URL="${CLIENT_PREVIEW_URL:-https://cnber-client-preview.workers.dev/}"
DRIVER_URL="${DRIVER_PREVIEW_URL:-https://cnber-driver-preview.workers.dev/}"
ADMIN_URL="${ADMIN_PREVIEW_URL:-https://cnber-admin-preview.workers.dev/}"
sed \
  -e "s|__CNBER_GIT_BRANCH__|${BRANCH}|g" \
  -e "s|__CNBER_GIT_HEAD__|${HEAD}|g" \
  -e "s|__CNBER_BUILD_TIME__|${BUILD_TIME}|g" \
  -e "s|__CLIENT_PREVIEW_URL__|${CLIENT_URL}|g" \
  -e "s|__DRIVER_PREVIEW_URL__|${DRIVER_URL}|g" \
  -e "s|__ADMIN_PREVIEW_URL__|${ADMIN_URL}|g" \
  "$PORTAL_SRC" > "$PORTAL_OUT/index.html"

deploy cnber-preview-portal "$PORTAL_OUT"
