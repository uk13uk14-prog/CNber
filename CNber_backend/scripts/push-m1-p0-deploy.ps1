# 将 P0 部署包同步到 M1 并执行一键部署
# 前置：M1 已授权本机 SSH 公钥
#   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh agent001@192.168.1.187 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
# 用法：powershell -ExecutionPolicy Bypass -File CNber_backend/scripts/push-m1-p0-deploy.ps1

$ErrorActionPreference = "Stop"
$M1 = "agent001@192.168.1.187"
$RemoteCnber = "~/Desktop/CNber"
$LocalRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

Write-Host "Local root: $LocalRoot"
Write-Host "Syncing to $M1:$RemoteCnber ..."

scp -r "$LocalRoot\CNber_backend\scripts\m1-p0-bundle" "${M1}:${RemoteCnber}/CNber_backend/scripts/"
scp "$LocalRoot\CNber_backend\scripts\m1P0Deploy.sh" "${M1}:${RemoteCnber}/CNber_backend/scripts/"
scp "$LocalRoot\CNber_backend\scripts\seedPaymentAccounts.js" "${M1}:${RemoteCnber}/CNber_backend/scripts/"

Write-Host "Running deploy on M1..."
ssh $M1 "cd $RemoteCnber && chmod +x CNber_backend/scripts/m1P0Deploy.sh && bash CNber_backend/scripts/m1P0Deploy.sh"
