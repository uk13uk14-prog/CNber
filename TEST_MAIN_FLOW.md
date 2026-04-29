# CNber 主链路验收清单（按当前代码实际接口）

> 本文件只覆盖当前代码已支持的主链路：  
> 乘客下单 → 管理端看到订单 → 管理端指派司机 → 司机看到订单 → 接单 / 开始 / 完成 → 乘客看到完成状态。  

## 1. 验收边界

本轮纳入：

- 乘客创建订单。
- 乘客按当前用户身份查看自己的订单列表。
- 管理端按当前 `/order/list` 实际返回逻辑查看订单。
- 管理端指派在线司机。
- 司机端按当前接口实际返回逻辑看到指派给自己的订单。
- 司机确认接单、开始行程、完成订单。
- 乘客端看到订单最终为 `completed`。

本轮不纳入：

- 不验证评价、打赏、真实支付、提现、账单结算。

【后续增强】订单列表的高级筛选和分组能力另行设计，不纳入本轮主链路。

## 2. 当前真实接口与字段

### 2.1 订单核心字段

以 `CNber_backend/models/Order.js` 为准：

- `userId`：乘客用户。
- `driverId`：当前司机。
- `assignedDriver`：后台指派司机。
- `assignedDriverName`、`assignedDriverPhone`：指派司机展示快照。
- `assignedAt`：指派时间。
- `dispatchStatus`：`unassigned | assigned | accepted | rejected | completed`。
- `orderNo`、`orderDateKey`、`dailySeq`：订单编号相关字段。
- `status`：`pending | assigned | accepted | started | completed | cancelled`。
- `pickup`：上车 / 起点。
- `destination`：目的地。
- `serviceType`：`ride | pickup | dropoff | charter | point` 等。
- `amount`：金额。
- `priceStatus`：`pending | quoted | confirmed`。
- `paymentStatus`：`unpaid | pending | paid | refunded`。
- `createdAt`、`updatedAt`。

### 2.2 订单列表真实返回逻辑

`GET /api/order/list`：

- 乘客 `role=user`：只返回 `userId = 当前用户` 的订单。
- 司机 `role=driver`：只返回 `driverId = 当前用户` 的订单。
- 管理员 `role=admin`：默认返回订单集合；当前代码支持若干 query 筛选，但本轮主链路不依赖范围筛选。
- 返回结构：`{ code: 0, message: 'success', data: { orders } }`。

管理端只验收“新建订单能在当前接口真实返回结果中被找到”。司机端只验收“被指派司机能在当前接口真实返回结果中看到该订单”。

### 2.3 主链路接口

乘客下单：

- `POST /api/order/create`
- 请求核心字段：`pickup`、`destination`、`serviceType`
- 后端强制写入：`userId = 当前乘客`，`status = pending`
- 成功返回：`data.order`

乘客确认价格：

- `POST /api/order/confirm-price`
- 请求字段：`orderId`
- 要求：订单 `priceStatus = quoted`
- 成功后：`priceStatus = confirmed`，`paymentStatus = pending`

乘客模拟支付：

- `POST /api/order/pay`
- 请求字段：`orderId`
- 要求：订单 `priceStatus = confirmed` 且 `amount > 0`
- 成功后：`paymentStatus = paid`

管理端查看订单列表：

- `GET /api/order/list`
- 成功返回：`data.orders`

管理端查看订单详情：

- `GET /api/admin/orders/:id`
- 成功返回：`data.order`

管理端指派司机：

- `POST /api/admin/orders/:id/assign`
- 请求字段：`driverUserId`
- 要求：目标用户存在、`role = driver`、司机 `driverProfile.status = online`
- 要求：订单状态为 `pending` 或 `assigned`
- 成功后：
  - `driverId = driverUserId`
  - `assignedDriver = driverUserId`
  - `dispatchStatus = assigned`
  - 若原状态为 `pending`，则 `status = assigned`

司机查看订单：

- 当前司机端代码调用：`GET /api/driver/orders`
- 成功返回：`data.orders`
- 当前非 history 逻辑返回指派 / 已接 / 进行中 / 已完成等与当前司机相关的订单。

司机确认接单：

- 当前司机端代码调用：`PATCH /api/driver/orders/:id/accept`
- 成功后：
  - `driverId = 当前司机`
  - `dispatchStatus = accepted`
  - `status = accepted`

司机开始行程：

- 当前后端主接口：`POST /api/order/start`
- 请求字段：`orderId`
- 要求：
  - 当前用户为司机
  - `driverId = 当前司机`
  - `status = accepted`
  - `paymentStatus = paid`
- 成功后：`status = started`

司机完成订单：

- 当前后端主接口：`POST /api/order/complete`
- 请求字段：`orderId`
- 要求：
  - 当前用户为司机
  - `driverId = 当前司机`
  - `status = started`
- 成功后：`status = completed`

乘客查看完成状态：

- `GET /api/order/list`
- 或 `GET /api/order/detail/:id`
- 要求：该订单在乘客本人订单中可见，`status = completed`。

## 3. 验收前置条件

- 后端服务已启动，数据库可读写。
- 准备 3 类账号：乘客、管理员、司机。
- 管理员账号 `role = admin`。
- 司机账号 `role = driver`。
- 用于指派的司机 `driverProfile.status = online`，否则管理端指派会失败。
- API Base 指向同一个后端环境。
- 乘客、管理端、司机端均使用各自账号登录，且请求带有效 token。
- 若执行“开始行程”，订单必须已完成模拟支付，即 `paymentStatus = paid`。

## 4. 主链路验收步骤

| 编号 | 角色 | 操作 | 接口 / 页面 | 预期结果 |
|------|------|------|-------------|----------|
| 1 | 乘客 | 创建订单，填写 `pickup`、`destination`、`serviceType` | `POST /api/order/create` | 返回 `code=0`，`data.order._id` 存在，`status=pending`，`userId` 为当前乘客 |
| 2 | 乘客 | 记录订单 ID，并刷新本人订单列表 | `GET /api/order/list` | 列表中能找到该订单；订单属于当前乘客 |
| 3 | 乘客 | 如页面要求支付前置，确认价格 | `POST /api/order/confirm-price` | 成功后 `priceStatus=confirmed`，`paymentStatus=pending` |
| 4 | 乘客 | 执行模拟支付 | `POST /api/order/pay` | 成功后 `paymentStatus=paid` |
| 5 | 管理员 | 打开订单列表，查找刚创建的订单 | `GET /api/order/list` | 当前接口真实返回的 `orders` 中能找到该订单 |
| 6 | 管理员 | 打开订单详情 | `GET /api/admin/orders/:id` | 返回 `code=0`，订单 ID 与步骤 1 一致 |
| 7 | 管理员 | 指派在线司机 | `POST /api/admin/orders/:id/assign`，body: `{ driverUserId }` | 返回 `code=0`；`status=assigned`；`driverId/assignedDriver` 指向目标司机；`dispatchStatus=assigned` |
| 8 | 司机 | 打开司机订单列表 | `GET /api/driver/orders` | 当前接口真实返回的 `orders` 中能看到该订单 |
| 9 | 司机 | 确认接单 | `PATCH /api/driver/orders/:id/accept` | 返回 `code=0`；`status=accepted`；`dispatchStatus=accepted`；`driverId` 为当前司机 |
| 10 | 司机 | 开始行程 | `POST /api/order/start`，body: `{ orderId }` | 返回 `code=0`；`status=started`；若失败且提示未支付，应回到步骤 3-4 补齐支付状态 |
| 11 | 司机 | 完成订单 | `POST /api/order/complete`，body: `{ orderId }` | 返回 `code=0`；`status=completed` |
| 12 | 乘客 | 查看订单列表或详情 | `GET /api/order/list` 或 `GET /api/order/detail/:id` | 乘客本人可见该订单，最终 `status=completed` |

## 5. 通过标准

本轮主链路通过需同时满足：

- 创建订单成功，初始状态为 `pending`。
- 管理端能在当前真实订单列表返回中找到该订单。
- 管理端能将订单指派给在线司机。
- 指派后订单状态为 `assigned`，并写入司机关联字段。
- 司机端能在当前真实返回中看到指派订单。
- 司机确认接单后状态为 `accepted`。
- 支付状态满足 `paid` 后，司机可以开始行程，状态变为 `started`。
- 司机完成订单后状态为 `completed`。
- 乘客端最终能看到该订单为 `completed`。

## 6. 阻塞与记录规则

以下情况判定为本轮主链路阻塞：

- 乘客无法创建订单。
- 管理端订单列表按当前接口真实返回逻辑找不到新订单。
- 在线司机无法被指派。
- 指派成功后司机端当前真实订单列表看不到该订单。
- 司机无法确认接单。
- 订单已支付且状态为 `accepted`，但司机无法开始行程。
- 订单为 `started`，但司机无法完成订单。
- 订单完成后，乘客端无法看到 `completed` 状态。

以下情况不作为本轮主链路失败，记录为【后续增强】：评价、打赏、提现、真实支付、财务结算，以及订单列表高级筛选和分组能力。

## 7. 执行记录模板

| 字段 | 内容 |
|------|------|
| 执行日期 | |
| 环境 | |
| 后端地址 | |
| 乘客账号 | |
| 管理员账号 | |
| 司机账号 | |
| 订单 ID | |
| 指派司机 ID | |
| 最终状态 | |
| 是否通过 | 通过 / 不通过 / 阻塞 |
| 问题备注 | |

