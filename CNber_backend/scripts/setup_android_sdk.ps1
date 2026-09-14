# CNber Phase 3 — Android SDK / Emulator 自动安装（官方源）
$ErrorActionPreference = 'Stop'

$SdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$CmdZip = Join-Path $env:TEMP 'commandlinetools-win-latest.zip'
$CmdUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$JavaHome = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-17*' -Directory | Select-Object -First 1).FullName

Write-Host "SDK Root: $SdkRoot"
Write-Host "JAVA_HOME: $JavaHome"

New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null
$CmdDir = Join-Path $SdkRoot 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $CmdDir 'bin\sdkmanager.bat'))) {
  Write-Host 'Downloading Android command-line tools...'
  Invoke-WebRequest -Uri $CmdUrl -OutFile $CmdZip -UseBasicParsing
  $ExtractTmp = Join-Path $env:TEMP 'android-cmdline-extract'
  if (Test-Path $ExtractTmp) { Remove-Item $ExtractTmp -Recurse -Force }
  Expand-Archive -Path $CmdZip -DestinationPath $ExtractTmp -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $SdkRoot 'cmdline-tools') | Out-Null
  if (Test-Path $CmdDir) { Remove-Item $CmdDir -Recurse -Force }
  Move-Item (Join-Path $ExtractTmp 'cmdline-tools') $CmdDir
  Remove-Item $ExtractTmp -Recurse -Force -ErrorAction SilentlyContinue
}

$env:JAVA_HOME = $JavaHome
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot
$env:PATH = "$JavaHome\bin;$SdkRoot\cmdline-tools\latest\bin;$SdkRoot\platform-tools;$SdkRoot\emulator;$env:PATH"

$sdkmanager = Join-Path $CmdDir 'bin\sdkmanager.bat'
Write-Host 'Accepting SDK licenses...'
$yes = ('y' + "`n") * 40
$yes | & $sdkmanager --licenses 2>&1 | Out-Null

$packages = @(
  'platform-tools',
  'emulator',
  'platforms;android-34',
  'system-images;android-34;google_apis;x86_64'
)
Write-Host "Installing packages: $($packages -join ', ')"
& $sdkmanager @packages 2>&1

$avdName = 'CNber_Pixel_7_API_34'
$avdmanager = Join-Path $CmdDir 'bin\avdmanager.bat'
$existing = & $avdmanager list avd 2>&1 | Out-String
if ($existing -notmatch $avdName) {
  Write-Host "Creating AVD: $avdName"
  echo no | & $avdmanager create avd -n $avdName -k 'system-images;android-34;google_apis;x86_64' -d 'pixel_7' --force
}

# Persist user environment variables
[Environment]::SetEnvironmentVariable('JAVA_HOME', $JavaHome, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $SdkRoot, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $SdkRoot, 'User')

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$addPaths = @(
  "$JavaHome\bin",
  "$SdkRoot\platform-tools",
  "$SdkRoot\emulator",
  "$SdkRoot\cmdline-tools\latest\bin"
)
foreach ($p in $addPaths) {
  if ($userPath -notlike "*$p*") {
    $userPath = if ($userPath) { "$userPath;$p" } else { $p }
  }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

Write-Host 'Android SDK setup complete.'
Write-Host "AVD: $avdName"
