# QA Demo Agent

一条命令完成 **预约用车 HTTP 闭环验收**（客户下单 → 支付 → 派单 → 司机接单 → 完成）。

## 运行

```bash
# 推荐（Agent 入口，报告写入 runtime/reports/）
npm run agent:qa

# 兼容旧命令（报告默认 /tmp/cnber_demo_report.json）
npm run demo:agent
```

## 前置条件

1. `CNber_backend/.env` 已配置 `JWT_SECRET`
2. MongoDB 可连接
3. 后端已启动：`npm start`（默认 `127.0.0.1:3100`）

## 测试数据

- 标记：`cnber_demo_agent`
- 账号：`cnber_demo_agent_customer@cnber.local` / `driver` / `admin`
- 密码：`CnberDemo_cnber_demo_agent_dev`（可用 `DEMO_AGENT_PASSWORD` 覆盖）

所有 Demo 数据带标记，可重复执行，不影响生产流程。

## 输出

| 文件 | 说明 |
|------|------|
| `runtime/reports/qa_demo_report.json` | 机器可读报告 |
| `runtime/reports/qa_demo_report.md` | Markdown 报告 |

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `DEMO_AGENT_HOST` | `127.0.0.1` | 后端地址 |
| `DEMO_AGENT_PORT` | `3100` | 后端端口 |
| `DEMO_AGENT_REPORT` | `runtime/reports/qa_demo_report.json` | 报告路径 |
| `DEMO_AGENT_PASSWORD` | 自动生成 dev 密码 | Demo 账号密码 |

## 结果

- `PASS` — 全流程成功，退出码 0
- `FAIL` — 任一步骤失败，退出码 1
