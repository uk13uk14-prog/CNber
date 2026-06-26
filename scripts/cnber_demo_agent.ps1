# CNber QA Demo Agent — Windows 等价入口（无 bash/WSL 时使用）
#
# 用法:
#   powershell -File scripts/cnber_demo_agent.ps1 [/tmp/cnber_demo_report.json]
#
param(
  [string]$ReportPath = "/tmp/cnber_demo_report.json"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "CNber_backend"
$Host_ = if ($env:DEMO_AGENT_HOST) { $env:DEMO_AGENT_HOST } else { "127.0.0.1" }
$Port = if ($env:DEMO_AGENT_PORT) { $env:DEMO_AGENT_PORT } else { "3100" }

if (-not (Test-Path $BackendDir)) {
  Write-Error "未找到 CNber_backend: $BackendDir"
}

try {
  Invoke-WebRequest -Uri "http://${Host_}:${Port}/api/status" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  Write-Error "后端未运行: http://${Host_}:${Port}/api/status — 请先在 CNber_backend 执行 npm start"
}

$env:DEMO_AGENT_REPORT = $ReportPath
$env:DEMO_AGENT_HOST = $Host_
$env:DEMO_AGENT_PORT = $Port

Set-Location $BackendDir
node scripts/cnberDemoAgent.js $ReportPath
exit $LASTEXITCODE
