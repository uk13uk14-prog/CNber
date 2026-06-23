# P0 预约制试运营闭环 — 模拟 Smoke 测试

在不接真实支付、不真实发短信、不启动三端 UI 的前提下，用 `npm run smoke:p0` 在 MongoDB 内完整跑通一单主流程。

## 1. 执行前准备

- MongoDB 已启动（默认 `mongodb://localhost:27017/cnber`）
- `CNber_backend/.env` 已配置：
  - `JWT_SECRET`（必填）
  - `MONGO_URL`（可选，默认见上）
  - `SMOKE_PROOF_IMAGE_URL`（可选，默认可访问的占位图 URL）
  - `PUBLIC_BASE_URL`（可选，仅影响上传凭证返回的绝对 URL）

## 2. 执行命令

```bash
cd CNber_backend
npm run smoke:p0
```

## 3. 脚本实际步骤（与 API 一致）

| 步骤 | 说明 |
|------|------|
| 1 | 创建/复用测试账号（乘客/司机/管理员） |
| 2 | 创建/复用 Wise、银行、微信测试收款账户 |
| 3 | 司机 `approved` + `isActive` + 车牌 TEST-001 |
| 4 | 创建预约订单（`pickup`，标签 `SMOKE_P0_TRIAL_FLOW`） |
| 5 | 后台报价 → 客户确认价格 |
| 6 | 客户提交定金（Wise + 测试 proof URL） |
| 7 | 后台确认定金 |
| 8 | 后台派司机 |
| 9 | 司机接单 |
| 10 | 后台发起尾款 → 客户提交尾款 |
| 11 | 后台确认尾款 |
| 12 | 司机开始行程 → 完成 |
| 13 | 司机结算 → 运营结案 |

说明：当前后端要求 **尾款确认后才能开始行程**，因此尾款在「开始行程」之前完成（与真实 API 一致）。

## 4. 期望输出

- 每步以 `✓` / `✗` 打印
- 末尾 JSON 报告含：`orderNo`、`orderId`、`status`、`depositStatus`、`balanceStatus`、`platformProfit`、`paymentMethod`、`paymentAccountDisplay` 等
- 最后一行：`>>> PASS`
- 退出码 `0`

失败时：`>>> FAIL`，退出码 `1`

## 5. 测试账号（脚本自动创建）

| 角色 | 登录标识（phone 字段） | 密码 |
|------|------------------------|------|
| 乘客 | test_customer@cnber.local | 123456 |
| 司机 | test_driver@cnber.local | 123456 |
| 管理员 | admin@cnber.local | 123456 |

## 6. 常见失败原因

| 现象 | 处理 |
|------|------|
| MongoDB 连接失败 | 启动 MongoDB，检查 `MONGO_URL` |
| JWT_SECRET 未设置 | 配置 `CNber_backend/.env` |
| 派单失败：司机未审核 | 重新跑脚本（会重置 Driver）或检查 `Driver` 集合 |
| 派单失败：定金未确认 | 上一步定金确认失败，看日志 |
| 开始行程失败：未支付尾款 | 脚本顺序问题，应已先确认尾款 |
| paymentAccount 无法解析 | 确认提交定金时带了 `paymentAccountId` |
| 订单已 COMPLETED 又跑 | 脚本会新建一单（pickup 含相同标签） |

## 7. 前端最小 Smoke（手工）

脚本不跑 E2E，发布前请人工确认页面可打开、无白屏：

### 管理 Web（需先 `npm run build` 并由后端托管 `/admin`）

- `/admin/payment-settings` — 能看到 P0测试 Wise 等账户
- `/admin/payment-reviews` — 有待审时可看到付款方式/收款账户列
- `/admin/driver-onboarding` — 测试司机为已通过
- `/admin/finance` — 对账表可打开
- `/admin/orders/:id` — 定金/尾款付款方式与收款账户有值

登录：`admin@cnber.local` / `123456`（phone 栏填完整字符串）

### 乘客端（HBuilder 运行）

- 定金页：`A0106_client_payment_v01?orderId=<smoke订单Id>`
- 尾款页：`A0106b_client_balance_payment_v01?orderId=...`
- 订单历史：`A0202_client_order_history_v01`

### 司机端

- 待接/当前/历史订单列表可打开；用 `test_driver@cnber.local` 登录

Smoke 报告中的 `orderId` 可用于拼乘客端/管理端 URL。
