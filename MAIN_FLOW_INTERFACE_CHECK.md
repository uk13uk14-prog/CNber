# CNber 主链路接口存在性检查

> 检查目标：只确认当前代码是否已存在主链路验收所需接口。  
> 检查原则：不新增权限过滤，不修改业务代码，不提交，不删除文件。  
> 结论范围：基于当前代码静态检查结果，不代表接口已完成运行时验收。

## 1. 接口总览

| 主链路能力 | 检查结果 | 当前路径 | 参数结论 | 备注 |
|------------|----------|----------|----------|------|
| 乘客创建订单 | 存在 | `POST /api/order/create` | 参数明确 | `pickup`、`destination` 必填，`serviceType` 可传 |
| 管理端查看订单 | 存在 | `GET /api/order/list`；另有 `GET /api/admin/orders`、`GET /api/admin/orders/:id` | 路径存在，列表入口有两个 | 当前 `CNber_admin_console_v1.0` 列表服务使用 `/api/order/list`，详情使用 `/api/admin/orders/:id` |
| 管理端指派司机 | 存在 | `POST /api/admin/orders/:id/assign` | 参数明确 | body 支持 `driverUserId`，也兼容 `driverId` |
| 司机查看订单 | 存在 | `GET /api/driver/orders` | 参数明确 | 默认返回与当前司机相关的指派/已接/进行中/已完成订单 |
| 司机接单 | 存在 | `PATCH /api/driver/orders/:id/accept` | 参数明确 | 路径参数 `id` 为订单 ID |
| 司机开始行程 | 存在 | `POST /api/order/start` | 参数明确 | body: `{ orderId }`；要求已支付 |
| 司机完成订单 | 存在 | `POST /api/order/complete` | 参数明确 | body: `{ orderId }` |
| 乘客查看订单状态 | 存在 | `GET /api/order/list`；`GET /api/order/detail/:id` | 参数明确 | 列表无额外参数；详情路径参数为订单 ID |

## 2. 分项检查

### 3.1 乘客创建订单

状态：存在。

后端路径：

- `POST /api/order/create`
- 路由来源：`CNber_backend/routes/order.js`
- 控制器：`orderController.createOrder`

当前参数：

- `pickup`：必填。
- `destination`：必填。
- `serviceType`：可传，当前允许 `ride | pickup | dropoff | charter | point`，不合法时回落为 `ride`。
- 其他扩展字段按订单类型可传，如机场、postcode、地址详情等。

当前后端行为：

- 强制 `userId = req.user.userId`。
- 强制 `status = pending`。
- 成功返回 `data.order`。

结论：主链路可用。

### 3.2 管理端查看订单

状态：存在。

当前可用路径：

- `GET /api/order/list`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`

当前前端对接：

- `CNber_admin_console_v1.0/services/order.js` 的 `fetchOrderList()` 调用 `order/list`。
- `fetchOrderDetail(orderId)` 调用 `admin/orders/:id`。

参数结论：

- `GET /api/order/list`：管理端可不传参数，按当前接口真实返回逻辑获取订单。
- `GET /api/admin/orders`：存在分页和筛选参数，但本轮主链路不依赖。
- `GET /api/admin/orders/:id`：路径参数 `id` 明确。

结论：主链路可用。  
备注：管理端列表存在两个可用入口，本轮建议按当前管理端服务实际调用的 `GET /api/order/list` 验证“能看到订单”，按 `GET /api/admin/orders/:id` 验证详情。

### 3.3 管理端指派司机

状态：存在。

后端路径：

- `POST /api/admin/orders/:id/assign`
- 兼容路径：`POST /api/admin/orders/:id/assign-driver`、`PATCH /api/admin/orders/:id/assign-driver`
- 路由来源：`CNber_backend/routes/admin.js`
- 控制器：`adminController.assignDriver`

当前参数：

- 路径参数 `id`：订单 ID。
- body `driverUserId`：司机用户 ID。
- body `driverId`：兼容字段，也会被读取。

当前后端要求：

- 目标司机存在。
- 目标用户 `role = driver`。
- 司机 `driverProfile.status = online`。
- 订单状态必须为 `pending` 或 `assigned`。

当前成功结果：

- `driverId = driverUserId`
- `assignedDriver = driverUserId`
- `dispatchStatus = assigned`
- 若原状态为 `pending`，则 `status = assigned`

结论：主链路可用。

### 3.4 司机查看订单

状态：存在。

后端路径：

- `GET /api/driver/orders`
- 路由来源：`CNber_backend/routes/driver.js`
- 控制器：`driverController.listDriverOrders`

当前前端对接：

- `CNber_driver_admin_v1.0/utils/driverApi.js` 的 `getDriverOrders()` 调用 `/driver/orders`。

参数结论：

- 本轮主链路不需要额外参数。

当前默认返回逻辑：

- 当前司机相关订单：`driverId = 当前司机` 或 `assignedDriver = 当前司机`。
- 状态范围：`assigned | accepted | started | completed`。

结论：主链路可用。

### 3.5 司机接单

状态：存在。

当前司机端路径：

- `PATCH /api/driver/orders/:id/accept`
- 路由来源：`CNber_backend/routes/driver.js`
- 控制器：`driverController.acceptAssignedOrder`

当前参数：

- 路径参数 `id`：订单 ID。
- 无 body 必填参数。

当前后端要求：

- 当前用户为司机。
- 订单 `assignedDriver = 当前司机`。
- 订单 `dispatchStatus = assigned`。

当前成功结果：

- `driverId = 当前司机`
- `dispatchStatus = accepted`
- `status = accepted`

结论：主链路可用。

补充：`POST /api/order/accept` 也存在，但当前司机端主链路代码使用的是 `PATCH /api/driver/orders/:id/accept`。本轮按当前司机端实际对接路径验收。

### 3.6 司机开始行程

状态：存在。

后端路径：

- `POST /api/order/start`
- 路由来源：`CNber_backend/routes/order.js`
- 控制器：`orderController.startOrder`

当前前端对接：

- `CNber_driver_admin_v1.0/pages/D0101_driver_order_list.vue` 调用 `/order/start`。
- `CNber_driver_admin_v1.0/pages/D0102_driver_order_detail.vue` 调用 `/order/start`。

当前参数：

- body `orderId`：订单 ID。

当前后端要求：

- 当前用户为司机。
- `driverId = 当前司机`。
- `status = accepted`。
- `paymentStatus = paid`。

结论：主链路可用。  
注意：如果订单未支付，开始行程会失败；主链路验收前需确保订单已完成模拟支付。

### 3.7 司机完成订单

状态：存在。

后端路径：

- `POST /api/order/complete`
- 路由来源：`CNber_backend/routes/order.js`
- 控制器：`orderController.completeOrder`

当前前端对接：

- `CNber_driver_admin_v1.0/pages/D0101_driver_order_list.vue` 调用 `/order/complete`。
- `CNber_driver_admin_v1.0/pages/D0102_driver_order_detail.vue` 调用 `/order/complete`。
- `CNber_driver_admin_v1.0/pages/D0103_driver_trip_tracking.vue` 调用 `/order/complete`。

当前参数：

- body `orderId`：订单 ID。

当前后端要求：

- 当前用户为司机。
- `driverId = 当前司机`。
- `status = started`。

当前成功结果：

- `status = completed`。

结论：主链路可用。

### 3.8 乘客查看订单状态

状态：存在。

当前路径：

- `GET /api/order/list`
- `GET /api/order/detail/:id`

当前前端对接：

- `CNber_client_admin_v1.0/utils/orderApi.js` 的 `fetchOrderList()` 调用 `/order/list`。
- `fetchOrderDetail(orderId)` 调用 `/order/detail/:id`。
- 乘客等待页、行程中页、完成页、历史订单页均有基于订单列表的状态读取逻辑。

当前参数：

- `GET /api/order/list`：无必填参数。
- `GET /api/order/detail/:id`：路径参数 `id` 为订单 ID。

当前后端权限逻辑：

- 乘客列表只返回 `userId = 当前用户` 的订单。
- 乘客详情只允许查看本人订单。

结论：主链路可用。

## 3. 风险与不确定项

### 3.1 路径不确定

管理端查看订单存在两个可用列表入口：

- `GET /api/order/list`
- `GET /api/admin/orders`

当前 `CNber_admin_console_v1.0` 服务层使用 `GET /api/order/list` 作为订单列表入口，因此本轮主链路建议以该路径为准。`GET /api/admin/orders` 可作为管理端分页列表增强能力，不作为本轮主链路必要条件。

### 3.2 参数不确定

本轮主链路参数整体明确，只有以下注意项：

- 管理端指派司机 body 支持 `driverUserId`，也兼容 `driverId`；建议验收统一使用 `driverUserId`。
- 司机开始行程要求 `paymentStatus = paid`，因此验收脚本或人工步骤必须先完成价格确认与模拟支付。

### 3.3 不纳入本轮

以下不作为本轮主链路接口缺失：

- 新增角色/组织/员工/区域权限过滤。
- 评价、打赏、提现、真实支付、财务结算。

## 4. 最终结论

主链路所需接口均已在当前代码中存在：

- 乘客创建订单：存在。
- 管理端查看订单：存在。
- 管理端指派司机：存在。
- 司机查看订单：存在。
- 司机接单：存在。
- 司机开始行程：存在。
- 司机完成订单：存在。
- 乘客查看订单状态：存在。

本轮可以进入主链路验收准备。执行时需注意：不新增权限过滤，不改业务代码，指派司机需在线，开始行程前订单需为已支付状态。

