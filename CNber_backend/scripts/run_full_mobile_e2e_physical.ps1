# CNber Full Mobile E2E — 双 Android 真机 + Admin Web 闭环
$ErrorActionPreference = 'Stop'

$BackendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$JavaHome = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-17*' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
$HxCli = if ($env:HBUILDERX_CLI) { $env:HBUILDERX_CLI } elseif (Test-Path 'C:\Users\eulan\Desktop\HBuilderX\cli.exe') { 'C:\Users\eulan\Desktop\HBuilderX\cli.exe' } else { 'C:\Users\eulan\Downloads\HBuilderX\cli.exe' }

$env:JAVA_HOME = $JavaHome
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot
$env:ADB_PATH = Join-Path $SdkRoot 'platform-tools\adb.exe'
$env:HBUILDERX_CLI = $HxCli
$env:E2E_TARGET = 'physical'
# E2E_SYNC_FIRST=1 默认 HBuilderX 同步；E2E_SYNC_FIRST=0 跳过同步，只接管已运行 App
if (-not $env:E2E_SYNC_FIRST) { $env:E2E_SYNC_FIRST = '1' }
$env:PATH = "$JavaHome\bin;$SdkRoot\platform-tools;$env:PATH"

Write-Host "Backend: $BackendRoot"
Write-Host "ADB: $($env:ADB_PATH)"
Write-Host "HBuilderX: $HxCli"
if ($env:E2E_SYNC_FIRST -eq '0') {
  Write-Host 'Target: physical takeover (E2E_SYNC_FIRST=0 — no HBuilderX CLI, verify running apps only)'
} else {
  Write-Host 'Target: physical sync-first (APK optional via E2E_USE_APK=1)'
}
Write-Host ""

$adb = $env:ADB_PATH
Write-Host '=== adb devices ==='
& $adb devices

if ($env:CLIENT_DEVICE) { Write-Host "CLIENT_DEVICE=$($env:CLIENT_DEVICE)" }
if ($env:DRIVER_DEVICE) { Write-Host "DRIVER_DEVICE=$($env:DRIVER_DEVICE)" }

# 检测局域网 IP 供参考（Agent 内也会自动检测）
try {
  $lan = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -match '^(192\.168\.|10\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Select-Object -First 1
  if ($lan) {
    Write-Host "Suggested LAN API: http://$($lan.IPAddress):3100/api"
    if (-not $env:E2E_API_BASE_URL) {
      $env:E2E_API_BASE_URL = "http://$($lan.IPAddress):3100/api"
    }
  }
} catch {
  Write-Host 'LAN IP auto-detect skipped (set E2E_LAN_IP if needed)'
}

Push-Location $BackendRoot
try {
  if (-not (Test-Path 'node_modules\playwright')) {
    npm install playwright --save-dev --no-fund --no-audit
    npx playwright install chrome
  }
  node agents/full_mobile_e2e/index.js
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
