#!/usr/bin/env bash
# CNber QA Demo Agent — 一条命令跑通预约用车闭环验收
#
# 用法:
#   bash scripts/cnber_demo_agent.sh [/tmp/cnber_demo_report.json]
#
# 环境变量（可选）:
#   DEMO_AGENT_HOST   默认 127.0.0.1
#   DEMO_AGENT_PORT   默认 3100
#   DEMO_AGENT_PASSWORD  Demo 账号密码（默认自动生成固定 dev 密码）
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/CNber_backend"
REPORT_PATH="${1:-/tmp/cnber_demo_report.json}"
HOST="${DEMO_AGENT_HOST:-127.0.0.1}"
PORT="${DEMO_AGENT_PORT:-3100}"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "❌ 未找到 CNber_backend 目录: ${BACKEND_DIR}" >&2
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" ]] && [[ -z "${JWT_SECRET:-}" ]]; then
  echo "❌ 请配置 CNber_backend/.env（至少 JWT_SECRET）" >&2
  exit 1
fi

# 检查后端是否已启动
if ! curl -sf "http://${HOST}:${PORT}/api/status" >/dev/null 2>&1; then
  echo "❌ 后端未运行: http://${HOST}:${PORT}/api/status" >&2
  echo "   请先在 CNber_backend 目录执行: npm start" >&2
  exit 1
fi

export DEMO_AGENT_REPORT="${REPORT_PATH}"
export DEMO_AGENT_HOST="${HOST}"
export DEMO_AGENT_PORT="${PORT}"

cd "${BACKEND_DIR}"
node scripts/cnberDemoAgent.js "${REPORT_PATH}"
exit $?
