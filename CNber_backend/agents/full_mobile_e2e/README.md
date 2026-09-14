# CNber Full Mobile E2E Agent

双 Android 模拟器 + Admin Web (Playwright) 完整闭环验收。

## 命令

```bash
# PowerShell（推荐，自动配置 SDK / Playwright）
powershell -File scripts/run_full_mobile_e2e.ps1

# 或直接
npm run agent:e2e
```

## 流程

1. 检查 Backend `/api/status`
2. 创建/更新 `cnber_demo_agent` 测试账号（不影响真实用户）
3. 启动 Emulator #1 (5554) + #2 (5556)
4. 安装/同步 Client & Driver App（APK 或 HBuilderX CLI）
5. Playwright 打开 Admin Web 登录
6. Client 模拟器：登录 → 下单 → 提交定金
7. Admin Web：确认付款 → 派单
8. Driver 模拟器：接单 → 开始行程 → 完成
9. Client 模拟器：验证订单已完成
10. 每步截图 + 输出报告

## 报告

- `runtime/reports/full_mobile_e2e_report.json`
- `runtime/reports/full_mobile_e2e_report.md`
- `runtime/reports/full_mobile_e2e_screenshots/*.png`

## 环境变量

| 变量 | 说明 |
|------|------|
| `HBUILDERX_CLI` | HBuilderX cli.exe 路径 |
| `E2E_API_BASE_URL` | 模拟器 API 地址，默认 `http://10.0.2.2:3100/api` |
| `E2E_ADMIN_WEB_URL` | Admin Web 登录页，默认自动探测 5173–5176 |
| `E2E_FORCE_HXB` | 设为 `1` 强制 HBuilderX 重新编译运行 |
| `MOBILE_AGENT_APK` | Client APK 路径 |
| `MOBILE_AGENT_DRIVER_APK` | Driver APK 路径 |

## 前置条件

- Backend: `npm start`（端口 3100）
- MongoDB 运行中
- Android SDK + AVD（`scripts/setup_android_sdk.ps1`）
- 第二 AVD: `CNber_Emulator_2`（脚本自动使用）
- HBuilderX CLI（Driver/Client 无 APK 时自动调用）
- Playwright + Chrome

## 边界

- 不修改业务代码
- 不清空数据库、不删除真实订单
- 仅使用 `cnber_demo_agent` 标记的测试账号与订单
