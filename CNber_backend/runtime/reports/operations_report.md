# CNber Operations Agent 报告

**结果**: WARN
**开始**: 2026-06-26T13:08:50.770Z
**结束**: 2026-06-26T13:08:50.857Z

## 订单巡检

- 长时间未派单: **3** (>2h)
- 长时间未支付: **1** (>24h)
- 长时间未完成: **2** (>48h)

## 司机

- 在线: **3**
- 离线: **4**
- 在线但长时间未活跃: **0**

## Job Queue

| Pending | Running | Failed | Success |
|---------|---------|--------|---------|
| 0 | 0 | 0 | 0 |

## 数据库

- MongoDB: **正常** (connected, ping 10ms)

## API

- /api/status: **OK** (HTTP 200)
- /api/admin/system-health: HTTP 401

## 告警

- [warn] 3 笔订单长时间未派单
- [warn] 1 笔订单长时间未支付/待审
- [warn] 2 笔订单长时间未完成
