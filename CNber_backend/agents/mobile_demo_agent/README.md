# Mobile Demo Agent

自动完成 **CNber Client App** 手机端验收（优先 Android）。

## 运行

```bash
npm run agent:mobile
```

## 前置条件

- 已安装 [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)（`adb` 在 PATH 中）
- Android 模拟器或真机已连接且 `adb devices` 显示 `device`
- 设备上已安装 CNber Client App（`CNber_client_admin_v1.0` 打包产物）

## 无设备时

不会失败，输出：

```
Skipped:
No Android device detected.
```

退出码 0，结果 `SKIPPED`。

## 自动执行流程

1. 启动 App
2. 登录 Demo 测试账号
3. 填写接机预约订单并提交
4. 查看订单详情
5. 各步骤截图
6. 导出 JSON + Markdown 报告

## 输出

- `runtime/reports/mobile_demo_report.json`
- `runtime/reports/mobile_demo_report.md`
- `runtime/reports/mobile_screenshots/*.png`

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `MOBILE_AGENT_PACKAGE` | 自动探测 | Android 包名 |
| `MOBILE_AGENT_PHONE` | `cnber_demo_agent_customer@cnber.local` | 登录账号 |
| `MOBILE_AGENT_PASSWORD` | 同 QA Demo | 登录密码 |
| `ADB_PATH` | `adb` | ADB 可执行文件路径 |

## 后续预留

- iOS（Simulator / 真机）支持
