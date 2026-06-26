# Operations Agent

自动巡检 CNber 后台运营状态（**只读**，不修改业务数据）。

## 运行

```bash
npm run agent:ops
```

## 检查项

| 类别 | 内容 |
|------|------|
| 订单 | 长时间未派单、未支付、未完成 |
| 司机 | 在线/离线数量、长时间未活跃 |
| Job Queue | Pending / Running / Failed |
| 数据库 | MongoDB 连接与 ping |
| API | `/api/status`、`/api/admin/system-health` 可达性 |

## 输出

- `runtime/reports/operations_report.json`
- `runtime/reports/operations_report.md`

## 阈值（环境变量）

| 变量 | 默认 |
|------|------|
| `OPS_UNDISPATCH_MS` | 2 小时 |
| `OPS_UNPAID_MS` | 24 小时 |
| `OPS_INCOMPLETE_MS` | 48 小时 |
| `OPS_DRIVER_IDLE_MS` | 1 小时 |

## 结果

- `PASS` — 无 error 级告警
- `WARN` — 有 warn 级告警，退出码 0
- `FAIL` — 数据库或 API 不可用，退出码 1
