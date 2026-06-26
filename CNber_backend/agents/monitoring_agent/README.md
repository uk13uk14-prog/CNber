# Monitoring Agent

系统健康监控（**只读**，不修改业务数据）。

## 运行

```bash
npm run agent:monitor
```

## 检查项

- Backend（`/api/status`）
- MongoDB 连接与 ping
- Job Worker / Job Queue 状态
- Memory / CPU / Disk
- 日志中的 ERROR / WARN

## 输出

终端打印：

```
System Healthy
```

或

```
System Warning
```

报告文件：

- `runtime/reports/monitoring_report.json`
- `runtime/reports/monitoring_report.md`

## 阈值

| 变量 | 默认 | 说明 |
|------|------|------|
| `MONITOR_MEM_WARN` | 85 | 内存使用率告警 % |
| `MONITOR_CPU_WARN` | 85 | CPU 使用率告警 % |
| `MONITOR_DISK_WARN` | 90 | 磁盘使用率告警 % |
| `MONITOR_LOG_LINES` | 500 | 扫描日志行数 |

## 结果

- `PASS` + `System Healthy` — 无问题
- `WARN` + `System Warning` — 有 warn 级问题，退出码 0
- `FAIL` + `System Warning` — 有关键故障，退出码 1
