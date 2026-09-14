# CNber Full Mobile E2E — 双模拟器 + Admin Web 闭环（legacy）
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
$env:E2E_USE_EMULATOR = '1'
$env:E2E_TARGET = 'emulator'
$env:E2E_API_BASE_URL = 'http://10.0.2.2:3100/api'$env:PATH = "$JavaHome\bin;$SdkRoot\platform-tools;$SdkRoot\emulator;$env:PATH"

Write-Host "Backend: $BackendRoot"
Write-Host "ADB: $($env:ADB_PATH)"
Write-Host "HBuilderX: $HxCli"

$adb = $env:ADB_PATH
& $adb -s emulator-5554 reverse tcp:3100 tcp:3100 2>$null
& $adb -s emulator-5556 reverse tcp:3100 tcp:3100 2>$null

# 确保第二 AVD 存在
$avds = & (Join-Path $SdkRoot 'emulator\emulator.exe') -list-avds 2>$null
if ($avds -notcontains 'CNber_Emulator_2') {
  Write-Host 'Creating CNber_Emulator_2 AVD...'
  $avdmanager = Join-Path $SdkRoot 'cmdline-tools\latest\bin\avdmanager.bat'
  cmd /c "echo no| `"$avdmanager`" create avd -n CNber_Emulator_2 -k `"system-images;android-34;google_apis;x86_64`" -d pixel_7 --force"
}

# 启动模拟器（若未运行）
$devices = (& $adb devices) -match 'emulator-\d+\s+device'
if (-not ($devices -match '5554')) {
  Start-Process (Join-Path $SdkRoot 'emulator\emulator.exe') -ArgumentList '-avd','CNber_Pixel_7_API_34','-port','5554','-no-snapshot-load','-no-boot-anim' -WindowStyle Minimized
}
if (-not ($devices -match '5556')) {
  Start-Process (Join-Path $SdkRoot 'emulator\emulator.exe') -ArgumentList '-avd','CNber_Emulator_2','-port','5556','-no-snapshot-load','-no-boot-anim' -WindowStyle Minimized
}

Write-Host 'Waiting for emulators...'
$deadline = (Get-Date).AddMinutes(4)
while ((Get-Date) -lt $deadline) {
  $ready = @(
    (& $adb -s emulator-5554 shell getprop sys.boot_completed 2>$null) -match '1'
    (& $adb -s emulator-5556 shell getprop sys.boot_completed 2>$null) -match '1'
  )
  if ($ready[0] -and $ready[1]) { break }
  Start-Sleep 5
}

# HBuilderX 预同步 — 仅 FULL_MOBILE_E2E_USE_HBUILDER=1 时启用
if ($env:FULL_MOBILE_E2E_USE_HBUILDER -eq '1') {
  if (Test-Path $HxCli) {
    Write-Host 'HBuilder fallback mode: launching Client on emulator-5554...'
    & $HxCli launch app-android --project CNber_client_admin_v1.0 --deviceId emulator-5554
    Write-Host 'HBuilder fallback mode: launching Driver on emulator-5556...'
    & $HxCli launch app-android --project CNber_driver_admin_v1.0 --deviceId emulator-5556
    Write-Host 'HBuilderX pre-sync done; Agent will verify login/home before business steps.'
  } else {
    Write-Warning "FULL_MOBILE_E2E_USE_HBUILDER=1 but HBuilderX CLI not found: $HxCli"
  }
} else {
  Write-Host 'APK mode (default): expecting runtime/apk/cnber_client.apk and cnber_driver.apk'
  Write-Host 'Set FULL_MOBILE_E2E_USE_HBUILDER=1 to use HBuilder base fallback.'
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
