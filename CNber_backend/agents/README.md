# CNber Phase 2 — AI Agents

四个独立 Agent，可单独运行，也可组合运行。

```
agents/
  qa_demo_agent/      # HTTP 闭环验收
  mobile_demo_agent/  # Android 手机端验收
  operations_agent/   # 后台运营巡检
  monitoring_agent/   # 系统健康监控
  _shared/            # 共享工具
  run_all.js          # 编排入口
```

## 命令

| 命令 | 说明 |
|------|------|
| `npm run agent:qa` | QA Demo Agent |
| `npm run agent:mobile` | Mobile Demo Agent |
| `npm run agent:ops` | Operations Agent |
| `npm run agent:monitor` | Monitoring Agent |
| `npm run agent:all` | 依次执行全部并生成汇总报告 |
| `npm run demo:agent` | 兼容旧 QA 命令 |

## 汇总报告

`npm run agent:all` 执行顺序：

1. QA Demo
2. Operations
3. Monitoring
4. Mobile（有设备时执行，无设备则 Skipped）

输出：

- `runtime/reports/agent_summary.json`
- `runtime/reports/agent_summary.md`

## 边界

- 仅属于 CNber，不引入其他项目代码
- 不修改订单/支付/RBAC/登录/Schema/已有 API 行为
- 所有 Agent 只读或仅写入 Demo 测试数据（QA Agent）
