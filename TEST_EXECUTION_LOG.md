# CNber 验收测试执行记录

> **用途**：与 `TEST_FLOW_CHECKLIST.md` 配套，在每次验收或回归时**复制本文件**或在本文件中追加「执行轮次」区块，填写**实际结果**与**是否通过**，形成可追溯记录。  
> **填写约定**：`是否通过` 仅填 **通过** / **不通过** / **阻塞** / **跳过**（跳过需写原因）。`实际结果` 尽量客观（界面表现、接口状态码、订单状态字段等）。

---

## 执行元数据（每轮执行前填写或复制一轮）

| 字段 | 内容 |
|------|------|
| 执行轮次 ID | EX-YYYYMMDD-序号（例：EX-20260419-01） |
| 执行日期 | |
| 执行人 | |
| 环境说明 | 例：本地 / 测试服 URL / 分支名 / 构建号 |
| 后端版本 / 提交 | |
| 乘客端 / Web / 司机端版本或提交 | |
| 关联需求或版本说明 | |

**本轮结论摘要**：（一句话，例：标准链 1.1–1.8 全部通过；取消单 4.2 不通过，见 TC-4.2。）

---

## 一、标准下单链

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-1.1 | 乘客登录，填写行程并提交下单（任一下单入口创建订单） | `POST /api/order/create` 成功，订单状态为 `pending`。 | | | |
| TC-1.2 | 乘客进入等待司机页（A0107） | 展示「待接单」类文案；轮询 `GET /api/order/list` 无报错；无 mock 假状态。 | | | |
| TC-1.3 | Web 管理端打开订单列表，找到该订单 | 状态为「待接单」；可进入订单详情。 | | | |
| TC-1.4 | Web 对订单执行「分配司机」 | 订单 `assigned`，已关联目标司机；乘客端轮询后仍在 A0107，文案为「已分配司机，等待确认」类含义。 | | | |
| TC-1.5 | 司机端以对应司机登录，在列表/详情中对 `assigned` 订单执行接单 | `POST /api/order/accept` 成功，订单 `accepted`。 | | | |
| TC-1.6 | 乘客端等待轮询 | 自动跳转 A0109；可看到司机电话等列表 populate 真实字段。 | | | |
| TC-1.7 | 司机端发起「开始行程」 | 订单 `started`；乘客端进入 A0110。 | | | |
| TC-1.8 | 司机端发起「完成订单」 | 订单 `completed`；乘客端进入 A0111，状态为已完成。 | | | |

**本分类小结**：（通过数 / 总数；阻塞项说明）

---

## 二、指派 / 撤销指派

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-2.1 | 对 `pending` 订单在 Web 执行分配司机 | 订单 `assigned`，`driverId` 正确。 | | | |
| TC-2.2 | 在 Web 订单详情对 `assigned` 执行「撤销指派」 | 订单回到 `pending`，司机清空或符合后端规则；司机端待确认表现符合后端列表规则。 | | | |
| TC-2.3 | 再次分配同一或其他司机 | 可再次 `assigned`；乘客端文案与轮询正常。 | | | |

**本分类小结**：

---

## 三、抢单兼容

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-3.1 | 订单保持 `pending` 且未在 Web 指派 | 目标司机在司机端从待接单池对该单执行接单。 | | | |
| TC-3.2 | 检查订单状态与 `driverId` | 抢单后 `accepted` 且写入该司机；乘客端进入 A0109。 | | | |
| TC-3.3 | 另一司机对同一单尝试接单 | 失败或明确提示已被接（与后端一致）。 | | | |

**本分类小结**：

---

## 四、取消单

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-4.1 | 通过管理端将订单置为 `cancelled`（或业务允许的取消路径） | 订单 `cancelled`；Web 详情为「已取消」。 | | | |
| TC-4.2 | 乘客在 A0107 / A0109 / A0110 等行程相关页等待轮询 | 主单为最近终态且为 `cancelled` 时，应 redirect 至 A0202，**不进入** A0111。 | | | |
| TC-4.3 | 乘客打开 A0202 | 列表中该单状态为「已取消」，与统一文案一致。 | | | |
| TC-4.4 | 从 A0111 尝试进入评价（若场景允许：已取消单不应误进完成评价流） | 仅已完成单带 `orderId` 进入 A0201 且能通过详情校验；已取消应在评价页被拦截并提示。 | | | |

**本分类小结**：

---

## 五、完成单 / 评价

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-5.1 | 一单走至 `completed`，乘客在 A0111 | 完成文案与订单摘要展示；「评价司机」可点击。 | | | |
| TC-5.2 | 点击「评价司机」 | 跳转 A0201 且 URL 含 `orderId`；`GET /api/order/detail/:id` 成功且 `completed` 时可填写评分。 | | | |
| TC-5.3 | 选星级后提交（不选打赏）；评价接口未开通时 | 弹窗明确说明接口未接入；**不得**出现无后端支撑的「评价成功」。 | | | |
| TC-5.4 | 选择打赏金额后提交 | 提示打赏/支付未接入并阻止；无虚假支付成功跳转。 | | | |
| TC-5.5 | （接口已接时）`ORDER_RATING_API_ENABLED` 为 true 且后端实现评价 API 后重复提交 | 以接口真实返回为准；成功则应有可验证的写入或后续查询。 | | | |

**本分类小结**：

---

## 六、可选：Web 订单详情时间线（与清单 §6 对应）

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 | 问题备注 |
|----------|----------|----------|----------|----------|----------|
| TC-6.1 | 打开任意订单详情 | 可见订单时间线；`createdAt` / 说明性脚注与 `updatedAt` 用法与实现一致，无伪造独立指派时间。 | | | |
| TC-6.2 | 存在跟进备注时 | 备注时间线按时间列出真实内容与时间。 | | | |

---

## 七、缺陷与跟踪（执行过程中随手记，可剪贴到工单）

| 关联用例 | 现象简述 | 初步类型（见 BUG_TRIAGE_GUIDE.md） | 优先级 | 跟踪链接 / 工单号 |
|----------|----------|-------------------------------------|--------|-------------------|
| | | | | |

---

## 使用说明

1. **首轮**：直接在本文件填写；或复制整份为 `TEST_EXECUTION_LOG_EX-20260419-01.md` 存档。  
2. **多轮**：在「执行元数据」下增加二级标题 `### EX-…` 并复制各分类表格一轮，避免覆盖历史。  
3. **与清单对齐**：用例编号 TC-x.y 与 `TEST_FLOW_CHECKLIST.md` 中表格序号一致，便于对读。  
4. **附件**：必要时在备注中写请求 ID、截图路径、数据库订单 `_id`。

---

## 执行轮次：EX-20260429-01 主链路接口跑测

| 字段 | 内容 |
|------|------|
| 执行日期 | 2026-04-29 |
| 执行人 | Cursor 验收代理 |
| 环境说明 | 本地后端 `http://localhost:3100/api`，MongoDB `mongodb://localhost:27017/cnber` |
| 后端版本 / 提交 | 当前工作区代码，未提交 |
| 乘客端 / 管理端 / 司机端版本或提交 | 当前工作区代码，未提交 |
| 关联需求或版本说明 | 按 `TEST_MAIN_FLOW.md` 与 `MAIN_FLOW_INTERFACE_CHECK.md` 执行主链路；不新增权限过滤，不改业务代码 |
| 订单 ID | `69f253b7a27b22b35d35c73b` |
| 本轮结论摘要 | 主链路接口跑测通过：乘客创建订单 → 管理端查看并指派 → 司机查看/接单/开始/完成 → 乘客看到 `completed`。 |

### 前置步骤

| 步骤 | 接口 | 参数 | HTTP 状态 | 返回状态 | 结果 | 备注 |
|------|------|------|-----------|----------|------|------|
| PRE-1 乘客登录 | `POST /api/auth/login` | `{ phone: "13900000002", password: "<redacted>" }` | 200 | `code=0` | PASS | 返回用户角色 `user` |
| PRE-2 管理员登录 | `POST /api/auth/login` | `{ phone: "13800000000", password: "<redacted>" }` | 200 | `code=0` | PASS | 返回用户角色 `admin` |
| PRE-3 司机登录 | `POST /api/auth/login` | `{ phone: "13900000001", password: "<redacted>" }` | 200 | `code=0` | PASS | 返回用户角色 `driver` |
| PRE-4 司机置为在线 | `PATCH /api/driver/status` | `{ status: "online" }` | 200 | `code=0` | PASS | 指派司机前置条件，返回 `status=online` |
| PRE-6 乘客确认价格 | `POST /api/order/confirm-price` | `{ orderId: "69f253b7a27b22b35d35c73b" }` | 200 | `code=0` | PASS | `priceStatus=confirmed`，`paymentStatus=pending` |
| PRE-7 乘客模拟支付 | `POST /api/order/pay` | `{ orderId: "69f253b7a27b22b35d35c73b" }` | 200 | `code=0` | PASS | `paymentStatus=paid`，满足开始行程前置条件 |

说明：创建订单后当前环境自动报价成功，订单 `priceStatus=quoted`、`amount=57`，因此未执行手动报价前置步骤。

### 主链路步骤

| 步骤 | 接口 | 参数 | HTTP 状态 | 返回状态 | 结果 | 关键状态 |
|------|------|------|-----------|----------|------|----------|
| 1 乘客创建订单 | `POST /api/order/create` | `{ pickup: "CNber acceptance pickup 1777488823803", destination: "CNber acceptance destination", serviceType: "ride" }` | 201 | `code=0` | PASS | `status=pending`，`priceStatus=quoted`，`paymentStatus=unpaid`，`amount=57` |
| 2 管理端查看订单列表 | `GET /api/order/list` | `{}` | 200 | `code=0` | PASS | 找到目标订单；`status=pending`；返回 `ordersReturned=2` |
| 2b 管理端查看订单详情 | `GET /api/admin/orders/69f253b7a27b22b35d35c73b` | `{}` | 200 | `code=0` | PASS | 详情订单 ID 匹配；`status=pending` |
| 3 管理端指派司机 | `POST /api/admin/orders/69f253b7a27b22b35d35c73b/assign` | `{ driverUserId: "69ea37417e2b13f8f81bebc0" }` | 200 | `code=0` | PASS | `status=assigned`，`dispatchStatus=assigned`，`driverId/assignedDriver` 写入目标司机 |
| 4 司机查看订单列表 | `GET /api/driver/orders` | `{}` | 200 | `code=0` | PASS | 找到目标订单；`status=assigned`，`dispatchStatus=assigned`；返回 `ordersReturned=1` |
| 5 司机接单 | `PATCH /api/driver/orders/69f253b7a27b22b35d35c73b/accept` | `{}` | 200 | `code=0` | PASS | `status=accepted`，`dispatchStatus=accepted` |
| 6 司机开始行程 | `POST /api/order/start` | `{ orderId: "69f253b7a27b22b35d35c73b" }` | 200 | `code=0` | PASS | `status=started` |
| 7 司机完成订单 | `POST /api/order/complete` | `{ orderId: "69f253b7a27b22b35d35c73b" }` | 200 | `code=0` | PASS | `status=completed` |
| 8 乘客查看完成状态 | `GET /api/order/list` | `{}` | 200 | `code=0` | PASS | 找到目标订单；最终 `status=completed`；返回 `ordersReturned=1` |

### 本轮结论

| 检查项 | 结果 |
|--------|------|
| 是否新增或修改权限过滤 | 否 |
| 是否修改业务代码 | 否 |
| 是否提交 Git | 否 |
| 订单状态是否闭环 | 是，`pending → assigned → accepted → started → completed` |
| 本轮是否通过 | 通过 |

---

## 执行轮次：EX-20260429-02 客人下单至司机端可见

| 字段 | 内容 |
|------|------|
| 执行日期 | 2026-04-29 |
| 执行人 | Cursor 验收代理 |
| 验收链路名称 | 客人下单 → 客服后台订单列表出现该订单 → 客服选择司机并指派 → 司机端订单列表出现该订单 |
| 环境说明 | 本地后端 `http://localhost:3100/api`，MongoDB `mongodb://localhost:27017/cnber` |
| 订单 ID | `69f25457a27b22b35d35c76b` |
| 本轮结论摘要 | PASS：客服后台可获取在线司机并完成指派，被分配司机在司机端订单列表可见该订单。 |

### 修改文件列表

| 文件 | 说明 |
|------|------|
| `CNber_admin_console_v1.0/services/driver.js` | 增加管理端在线司机列表调用 `fetchAvailableDrivers()` |
| `CNber_admin_console_v1.0/pages/B0103_admin_dispatch.vue` | 指派页改用在线司机接口，并用在线司机用户 ID 发起指派 |
| `CNber_admin_console_v1.0/components/AdminDriverCard.vue` | 兼容在线司机返回结构中的 `name`、`phone`、`status=online` |
| `CNber_admin_console_v1.0/config/driverDisplay.js` | 补充 `online` / `offline` 状态展示文案 |

### 断点原因

客服后台指派页原先调用 `GET /api/admin/drivers`，该接口返回的是 `Driver` 审核资料集合；而指派接口 `POST /api/admin/orders/:id/assign` 实际要求在线司机的 `User._id`，并会校验司机用户 `role=driver` 且 `driverProfile.status=online`。

当前后端已存在最小可用接口 `GET /api/admin/drivers/available`，可返回在线司机用户 ID，因此断点属于前端调用路径和字段映射不一致。

### 修复方式

| 修复项 | 内容 |
|--------|------|
| 在线司机来源 | 指派页从 `GET /api/admin/drivers` 改为 `GET /api/admin/drivers/available` |
| 指派参数 | 指派时优先兼容 `driver.userId`，否则使用在线司机返回的 `driver._id` 作为 `driverUserId` |
| 卡片展示 | 司机卡片兼容在线司机的 `name`、`phone`、`online` 状态 |
| 业务边界 | 未重构权限，未新增后端接口，未修改无关页面 |

### 验证结果

| 检查项 | 实际结果 | 是否通过 |
|--------|----------|----------|
| 乘客下单成功生成订单 | `orderId=69f25457a27b22b35d35c76b` | PASS |
| 客服后台获取可指派司机 | `selectedDriverStatus=online` | PASS |
| 客服后台完成指派 | `assignOrderStatus=assigned`，`assignDispatchStatus=assigned` | PASS |
| 司机端订单列表出现该订单 | `driverCanSeeAssignedOrder=true`，`driverVisibleOrderStatus=assigned` | PASS |

### 关键数据

| 字段 | 值 |
|------|----|
| `orderId` | `69f25457a27b22b35d35c76b` |
| `selectedDriverStatus` | `online` |
| `assignOrderStatus` | `assigned` |
| `assignDispatchStatus` | `assigned` |
| `driverCanSeeAssignedOrder` | `true` |
| `driverVisibleOrderStatus` | `assigned` |

### 本轮结论

PASS。该链路已验证通过：客人下单后，客服后台可看到订单并指派在线司机，被分配司机可在司机端订单列表看到该订单。

---

## 执行轮次：EX-20260429-03 订单后半段状态流转

| 字段 | 内容 |
|------|------|
| 执行日期 | 2026-04-29 |
| 执行人 | Cursor 验收代理 |
| 验收链路名称 | 司机接单（assigned）→ 开始行程 → 完成订单 → 乘客端看到完成状态 |
| 环境说明 | 本地后端 `http://localhost:3100/api`，MongoDB `mongodb://localhost:27017/cnber` |
| 订单 ID | `69f256ffa27b22b35d35c782` |
| 本轮结论摘要 | PASS：订单从 `assigned` 经司机接单变为 `accepted`，开始行程后为 `started`（对应进行中 / ongoing），完成后为 `completed`，乘客详情接口可见完成状态。 |

### 前置步骤

| 步骤 | 接口 | 参数 | HTTP 状态 | 返回状态 | 结果 | 关键状态 |
|------|------|------|-----------|----------|------|----------|
| PRE-1 乘客登录 | `POST /api/auth/login` | `{ phone: "13900000002", password: "<redacted>" }` | 200 | `code=0` | PASS | `role=user` |
| PRE-2 司机登录 | `POST /api/auth/login` | `{ phone: "13900000001", password: "<redacted>" }` | 200 | `code=0` | PASS | `role=driver` |
| PRE-3 管理员登录 | `POST /api/auth/login` | `{ phone: "13800000000", password: "<redacted>" }` | 200 | `code=0` | PASS | `role=admin` |
| PRE-4 司机在线 | `PATCH /api/driver/status` | `{ status: "online" }` | 200 | `code=0` | PASS | `driverStatus=online` |
| PRE-5 创建待指派订单 | `POST /api/order/create` | `{ pickup: "late flow pickup 1777489663864", destination: "late flow destination", serviceType: "ride" }` | 201 | `code=0` | PASS | `status=pending`，`priceStatus=quoted`，`paymentStatus=unpaid`，`amount=57` |
| PRE-7 确认价格 | `POST /api/order/confirm-price` | `{ orderId: "69f256ffa27b22b35d35c782" }` | 200 | `code=0` | PASS | `priceStatus=confirmed`，`paymentStatus=pending` |
| PRE-8 模拟支付 | `POST /api/order/pay` | `{ orderId: "69f256ffa27b22b35d35c782" }` | 200 | `code=0` | PASS | `paymentStatus=paid` |
| PRE-9 指派司机 | `POST /api/admin/orders/69f256ffa27b22b35d35c782/assign` | `{ driverUserId: "69ea37417e2b13f8f81bebc0" }` | 200 | `code=0` | PASS | `status=assigned`，`dispatchStatus=assigned`，`paymentStatus=paid` |

说明：开始行程接口要求 `paymentStatus=paid`，因此本轮为验证后半段状态流转，先完成确认价格和模拟支付前置步骤。

### 后半段链路步骤

| 步骤 | 接口 | 参数 | HTTP 状态 | 返回状态 | 结果 | 状态变化 |
|------|------|------|-----------|----------|------|----------|
| 1 司机接单 | `PATCH /api/driver/orders/69f256ffa27b22b35d35c782/accept` | `{}` | 200 | `code=0` | PASS | `assigned → accepted`，`dispatchStatus=accepted` |
| 2 司机开始行程 | `POST /api/order/start` | `{ orderId: "69f256ffa27b22b35d35c782" }` | 200 | `code=0` | PASS | `accepted → started`；前端可视为进行中 / ongoing |
| 3 司机完成订单 | `POST /api/order/complete` | `{ orderId: "69f256ffa27b22b35d35c782" }` | 200 | `code=0` | PASS | `started → completed` |
| 4 乘客查看完成状态 | `GET /api/order/detail/69f256ffa27b22b35d35c782` | `{}` | 200 | `code=0` | PASS | 乘客可见订单，`status=completed` |

### 本轮结论

| 检查项 | 结果 |
|--------|------|
| 是否新增或修改权限过滤 | 否 |
| 是否修改业务代码 | 否 |
| 是否提交 Git | 否 |
| 状态流转是否通过 | 是，`assigned → accepted → started(ongoing) → completed` |
| 乘客端是否可见完成状态 | 是，`GET /api/order/detail/:id` 返回 `status=completed` |
| 本轮是否通过 | PASS |
