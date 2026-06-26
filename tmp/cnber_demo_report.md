# CNber QA Demo Agent 报告

**结果**: PASS
**标记**: `cnber_demo_agent`
**开始**: 2026-06-26T12:51:42.907Z
**结束**: 2026-06-26T12:51:43.499Z

## 测试账号

| 角色 | 手机号 | User ID |
|------|--------|---------|
| 客户 | cnber_demo_agent_customer@cnber.local | 6a3e75da7e78521583c4ce75 |
| 司机 | cnber_demo_agent_driver@cnber.local | 6a3e75da7e78521583c4ce76 |
| 管理员 | cnber_demo_agent_admin@cnber.local | 6a3e75da7e78521583c4ce77 |

## 订单

- 订单号: **CNB-20260626-003**
- 订单 ID: `6a3e75df742a6afb7d057ff0`
- 最终状态: **已完成** (`completed`)

## 状态流

1. `quoted` (已自动报价) — 创建订单
2. `confirmed` (客户确认报价) — 确认报价
3. `confirmed` (客户确认报价) — 定金已提交 depositStatus=submitted
4. `deposit_paid` (已付订金) — 定金已确认
5. `assigned` (已指派司机) — 已派单
6. `driver_accepted` (司机已接单) — 司机已接单
7. `driver_accepted` (司机已接单) — 尾款已确认
8. `ready_to_start` (待出发) — 待出发
9. `in_progress` (行程中) — 行程中
10. `completed` (已完成) — 已完成

## 步骤

- ✓ **创建/更新 Demo 测试账号** — UPSERT mongodb://users: customer / driver / admin + 收款账户
- ✓ **检查后端健康** — GET /api/status: 127.0.0.1:3100
- ✓ **客户登录** — POST /api/auth/login: cnber_demo_agent_customer@cnber.local
- ✓ **司机登录** — POST /api/auth/login: cnber_demo_agent_driver@cnber.local
- ✓ **管理员登录** — POST /api/auth/login: cnber_demo_agent_admin@cnber.local
- ✓ **创建预约订单** — POST /api/order/create: CNB-20260626-003 scheduledAt=2026-06-27T13:51:43.335Z
- ✓ **客户确认报价** — POST /api/order/confirm-price: confirmed
- ✓ **客户提交定金** — POST /api/order/6a3e75df742a6afb7d057ff0/deposit/submit: £9
- ✓ **后台确认定金** — PATCH /api/admin/orders/6a3e75df742a6afb7d057ff0/payment/deposit/confirm: confirmed
- ✓ **后台派单** — POST /api/admin/orders/6a3e75df742a6afb7d057ff0/assign-driver: driver=6a3e75da7e78521583c4ce76
- ✓ **司机确认接单** — POST /api/order/accept: driver_accepted
- ✓ **后台发起尾款** — POST /api/admin/orders/6a3e75df742a6afb7d057ff0/balance/request: balance_pending
- ✓ **客户提交尾款** — POST /api/order/6a3e75df742a6afb7d057ff0/balance/submit: £81
- ✓ **后台确认尾款** — PATCH /api/admin/orders/6a3e75df742a6afb7d057ff0/payment/balance/confirm: confirmed
- ✓ **推进至待出发** — POST /api/admin/orders/6a3e75df742a6afb7d057ff0/pay-remaining: ready_to_start
- ✓ **司机开始行程** — POST /api/order/start: in_progress
- ✓ **司机完成订单** — POST /api/order/complete: completed
- ✓ **读取并验证订单详情** — GET /api/order/detail/6a3e75df742a6afb7d057ff0: CNB-20260626-003 → completed
