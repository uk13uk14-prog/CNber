# CNBER V2 Scope Permission Design

## 0. 背景与边界

CNber MVP v1.0 已完成并提交：

`9b93489 release: CNber MVP v1.0`

V1 已跑通核心链路：

乘客下单 -> 客服后台看到订单 -> 客服派单 -> 司机端看到 -> 司机接单 -> 开始 -> 完成 -> 乘客看到完成。

V1 也已支持取消订单。

本文件只做 V2 权限与订单 scope 架构设计，不包含代码实现，不修改现有主链路。

设计原则：

- 后端是最终权限来源，前端传参只作为视图选择，不作为授权依据。
- V2 默认兼容 V1，任何强权限启用都必须分阶段灰度。
- 优先复用现有字段，最小新增字段，不一次性大改数据库结构。
- 所有 scope 必须有管理员兜底入口，避免订单不可见。

## 一、V2 目标

V2 要解决的问题是：当平台进入多客服、多司机、多客户的正式运营阶段后，不同角色只能看到自己应该看到的订单，避免越权查看、误操作和运营混乱。

目标：

1. 乘客只能看到自己的订单。
2. 司机只能看到分配给自己的订单。
3. 客服只能看到自己负责或自己组内订单。
4. 管理员可以看到全部订单。
5. 保持 V1 主链路不被破坏。

V2 不改变订单主状态流：

`pending -> assigned -> accepted -> started -> completed`

扩展终态仍为：

`cancelled`

V2 只定义“谁能看、谁能操作、默认查什么范围”，不重新设计复杂状态机。

## 二、角色定义

当前 `User` 模型已有 `role` 字段，但枚举只有：

- `user`
- `driver`
- `admin`

V2 建议扩展为：

- `user` / `passenger`
- `driver`
- `staff`
- `dispatcher`
- `admin`
- `super_admin`

为兼容 V1，数据库中可继续保留 `user` 作为乘客角色，业务文档中可称为 `passenger`。

| 角色 | 建议 role 值 | 能做什么 | 不能做什么 |
|---|---|---|---|
| 乘客 | `user`，语义别名 `passenger` | 创建订单、查看自己的订单、取消自己的 `pending/assigned` 订单、确认价格、模拟支付或真实支付 | 不能查看别人的订单，不能派单，不能操作司机状态，不能访问管理端接口 |
| 司机 | `driver` | 查看分配给自己的订单、确认接单、拒单、开始行程、完成订单、司机侧取消已接单/行程中订单、维护司机资料和在线状态 | 不能查看其他司机订单，不能查看未授权乘客订单，不能派单，不能访问客服/管理员接口 |
| 客服 | `staff` | 查看自己负责的订单、查看待派单池、添加跟进备注、在授权范围内取消或协助处理订单 | 不能查看全部订单，不能管理系统配置，不能跨组查看订单，不能越权指派不属于自己范围的司机 |
| 调度员 | `dispatcher` | 查看待派单池、查看组内或授权范围订单、指派司机、撤销指派、查看可派司机 | 不能管理用户、不能改系统配置，不能查看超出调度范围的全部订单 |
| 管理员 | `admin` | 查看全部订单、查看统计、处理异常单、管理定价、查看司机/客户列表、兜底处理运营问题 | 不建议直接绕过审计；不应使用前端传入的 userId/driverId 来绕过权限 |
| 超级管理员 | `super_admin` | 拥有平台级最高权限：账号角色管理、组织/组管理、全局配置、全部订单兜底 | 不应参与日常派单；高危操作应有审计记录 |

角色落地建议：

- V2 初期可只扩展后端判断逻辑，暂不开放完整角色管理 UI。
- `admin` 在 V1 中承担客服、调度、管理员三类职责；V2 可逐步拆分为 `staff/dispatcher/admin`。
- `super_admin` 建议只用于后台账号和组织权限管理，不参与普通订单流。

## 三、订单归属字段设计

### 3.1 当前 Order model 已有字段

当前 `CNber_backend/models/Order.js` 已有：

| 当前字段 | 类型 | 现状用途 | V2 复用建议 |
|---|---|---|---|
| `userId` | `ObjectId -> User` | 创建订单时写入当前乘客 ID | 作为乘客归属字段复用，不建议新增 `passengerId` |
| `driverId` | `ObjectId -> User` | 派单后写入司机 ID；司机接单、开始、完成依赖它 | 作为司机归属字段复用 |
| `assignedDriver` | `ObjectId -> User` | 派单司机引用，当前与 `driverId` 存在重叠 | V2 可保留兼容，但建议后续统一语义 |
| `assignedDriverName` | `String` | 司机姓名快照 | 保留展示，不作为权限依据 |
| `assignedDriverPhone` | `String` | 司机电话快照 | 保留展示，不作为权限依据 |
| `assignedAt` | `Date` | 派单时间 | 保留 |
| `dispatchStatus` | `String` | 派单状态：`unassigned/assigned/accepted/rejected/completed` | 可辅助调度筛选，不替代 `status` |
| `status` | `String` | 主订单状态 | 继续作为主状态字段 |
| `followUpNotes.authorStaffId` | `ObjectId -> User` | 跟进备注创建人 | 可用于审计，不代表订单负责人 |

当前 `Order` 没有：

- `passengerId`
- `assignedByStaffId`
- `ownerStaffId`
- `staffGroupId`

### 3.2 字段设计结论

| 建议字段 | 是否新增 | 原因 |
|---|---:|---|
| `passengerId` | 不新增 | 当前 `userId` 已表示乘客归属。新增会造成双字段同步风险。文档和代码中可逐步将语义解释为 passenger owner。 |
| `driverId` | 复用 | 已用于派单、司机接单、开始、完成。V2 scope 直接基于它过滤司机订单。 |
| `assignedDriver` | 保留兼容 | 当前已有；短期不删。V2 查询司机归属时优先 `driverId`，必要时兼容 `$or: [{ driverId }, { assignedDriver }]`。 |
| `assignedByStaffId` | 最小新增 | 记录是谁执行派单，用于审计和“我的派单”。不影响订单可见性主判断。 |
| `ownerStaffId` | 最小新增 | 订单负责客服。用于 `staff_mine`。可在创建、认领、派单时写入。 |
| `staffGroupId` | 最小新增 | 订单所属客服组。用于 `staff_group`。旧订单可为空并由 admin 兜底。 |
| `status` | 复用 | 当前主状态足够，不新增状态枚举。 |

### 3.3 最小新增方案

建议在 `Order` 中最小新增 3 个可空字段：

| 字段 | 类型 | 默认值 | 用途 | 索引建议 |
|---|---|---|---|---|
| `assignedByStaffId` | `ObjectId -> User` | `null` | 记录最后一次派单操作者 | `{ assignedByStaffId: 1, createdAt: -1 }` |
| `ownerStaffId` | `ObjectId -> User` | `null` | 订单负责人，用于客服“我的订单” | `{ ownerStaffId: 1, status: 1, createdAt: -1 }` |
| `staffGroupId` | `ObjectId` 或 `String` | `null` | 订单所属组，用于组内可见 | `{ staffGroupId: 1, status: 1, createdAt: -1 }` |

不建议 V2 第一阶段新增复杂组织表。可以先将 `staffGroupId` 设计为可空字段，后续 V2.1 再引入 `StaffGroup` 模型。

## 四、订单 Scope 设计

Scope 是后端根据登录用户角色解析出的查询范围。前端可以请求某种视图，但最终 scope 必须以后端角色和用户身份为准。

| Scope | 适用角色 | 查询条件 | 是否需要新增字段 | 是否影响 V1 主链路 |
|---|---|---|---|---|
| `passenger_mine` | `user/passenger` | `{ userId: req.user.userId }` | 否，复用 `userId` | 不影响。当前 V1 已接近该逻辑。 |
| `driver_assigned` | `driver` | 推荐 `{ $or: [{ driverId: uid }, { assignedDriver: uid }] }`，状态可限制为 `assigned/accepted/started/completed/cancelled` | 否，复用 `driverId/assignedDriver` | 不影响。V1 司机列表已按 `driverId` 过滤。 |
| `staff_mine` | `staff/dispatcher/admin/super_admin` | `{ ownerStaffId: uid }`；没有负责人时可选 `{ assignedByStaffId: uid }` 作为过渡 | 是，`ownerStaffId`，可选 `assignedByStaffId` | 初期不启用强过滤，不影响 V1。 |
| `staff_group` | `staff/dispatcher/admin/super_admin` | `{ staffGroupId: { $in: user.staffGroupIds } }` 或 `{ staffGroupId: user.staffGroupId }` | 是，`staffGroupId`；User 也需组字段 | 初期只读启用，不影响 V1。 |
| `admin_all` | `admin/super_admin` | `{}`，可叠加状态、日期、手机号等筛选 | 否 | 保留 V1 管理员全量入口。 |
| `dispatch_pool` | `staff/dispatcher/admin/super_admin` | `{ status: 'pending', driverId: null }`，兼容 `{ assignedDriver: null }`，可叠加 `paymentStatus` 或服务类型 | 否，复用状态和司机字段 | 不影响。当前客服派单入口可以从 pending 池读取。 |

Scope 默认策略：

- `GET /api/order/list`：
  - `user` 默认 `passenger_mine`
  - `driver` 默认 `driver_assigned`
  - `admin` 默认 V1 兼容的 `admin_all`
  - V2 引入 `staff/dispatcher` 后默认分别为 `staff_mine` 或 `dispatch_pool`，需灰度。
- `GET /api/admin/orders`：
  - `admin/super_admin` 默认 `admin_all`
  - `staff/dispatcher` 默认不应是 `admin_all`，应为 `dispatch_pool/staff_mine/staff_group` 中一种。

## 五、API 设计

### 5.1 现有接口保留

以下接口保留，不破坏 V1：

| 接口 | V2 保留策略 |
|---|---|
| `GET /api/order/list` | 保留。按登录用户自动应用默认 scope；可接受有限 `scope` 视图参数，但必须由后端校验。 |
| `GET /api/order/detail/:id` | 保留。必须通过 `assertOrderAccess(order, user)` 校验单订单访问权。 |
| `POST /api/order/create` | 保留。继续强制使用 `req.user.userId` 写入 `userId`，禁止前端传 `userId`。 |
| `POST /api/admin/orders/:id/assign` | 保留。V2 只允许 `staff/dispatcher/admin/super_admin`，并记录 `assignedByStaffId/ownerStaffId/staffGroupId`。 |
| `POST /api/order/accept` | 保留兼容；建议长期统一到 driver 路由。只允许司机。 |
| `POST /api/order/start` | 保留。只允许当前司机。 |
| `POST /api/order/complete` | 保留。只允许当前司机。 |
| `POST /api/order/passenger-cancel` | 保留。只允许乘客取消自己的 `pending/assigned` 订单。 |

### 5.2 增加 scope 参数的接口

| 接口 | 是否允许 scope 参数 | 默认 scope | 说明 |
|---|---:|---|---|
| `GET /api/order/list` | 是，受限 | 按角色自动 | 乘客传任何 scope 都只能得到 `passenger_mine`；司机只能 `driver_assigned`；管理员可 `admin_all`。 |
| `GET /api/admin/orders` | 是，受限 | `admin_all` for admin，`dispatch_pool/staff_mine` for staff | 只用于管理端视图切换，不作为授权依据。 |
| `GET /api/admin/stats` | 后续可加 | 按角色自动 | V2.1 再设计统计 scope，避免 V2 首轮扩大范围。 |

### 5.3 必须按登录用户自动过滤的接口

| 接口 | 自动过滤规则 | 前端是否允许传 userId |
|---|---|---:|
| `POST /api/order/create` | `userId = req.user.userId` | 不允许 |
| `GET /api/order/list` | 乘客自动 `{ userId: req.user.userId }` | 不允许 |
| `GET /api/order/detail/:id` | 通过订单归属校验 | 不允许 |
| `POST /api/order/passenger-cancel` | 只能取消本人订单 | 不允许 |
| `POST /api/order/start` | 只能当前 `driverId` 司机开始 | 不允许 |
| `POST /api/order/complete` | 只能当前 `driverId` 司机完成 | 不允许 |

### 5.4 按角色划分接口

| 接口 | passenger/user | driver | staff | dispatcher | admin | super_admin |
|---|---:|---:|---:|---:|---:|---:|
| `POST /api/order/create` | 允许 | 禁止 | 禁止 | 禁止 | 可选禁止 | 可选禁止 |
| `GET /api/order/list` | `passenger_mine` | `driver_assigned` | `staff_mine/dispatch_pool` | `dispatch_pool/staff_group` | `admin_all` | `admin_all` |
| `GET /api/order/detail/:id` | 本人订单 | 自己订单 | 负责/组内订单 | 负责/组内/待派单 | 全部 | 全部 |
| `POST /api/admin/orders/:id/assign` | 禁止 | 禁止 | 可按授权允许 | 允许 | 允许 | 允许 |
| `POST /api/order/accept` | 禁止 | 当前司机订单 | 禁止 | 禁止 | 禁止 | 禁止 |
| `POST /api/order/start` | 禁止 | 当前司机订单 | 禁止 | 禁止 | 禁止 | 禁止 |
| `POST /api/order/complete` | 禁止 | 当前司机订单 | 禁止 | 禁止 | 禁止 | 禁止 |
| `POST /api/order/passenger-cancel` | 本人 `pending/assigned` | 禁止 | 禁止 | 禁止 | 禁止 | 禁止 |
| `POST /api/admin/orders/:id/status` | 禁止 | 禁止 | 可按授权取消 | 可按授权取消 | 允许 | 允许 |

### 5.5 API Scope 表格

| API | V2 scope | Query 核心条件 | 权限来源 | V1 兼容策略 |
|---|---|---|---|---|
| `GET /api/order/list` | `passenger_mine` | `{ userId: uid }` | token role=user | 当前逻辑已兼容 |
| `GET /api/order/list` | `driver_assigned` | `{ $or: [{ driverId: uid }, { assignedDriver: uid }] }` | token role=driver | 当前逻辑按 `driverId`，后续补 `assignedDriver` 兼容 |
| `GET /api/admin/orders` | `dispatch_pool` | `{ status: 'pending', driverId: null }` | role staff/dispatcher/admin | 新增视图，不替代 admin_all |
| `GET /api/admin/orders` | `staff_mine` | `{ ownerStaffId: uid }` | role staff/dispatcher | 字段上线前不强制 |
| `GET /api/admin/orders` | `staff_group` | `{ staffGroupId: groupId }` | role staff/dispatcher/admin | 字段上线前只读灰度 |
| `GET /api/admin/orders` | `admin_all` | `{}` | role admin/super_admin | 保持 V1 管理员兜底 |

## 六、权限中间件设计

当前鉴权文件：

`CNber_backend/middlewares/authMiddleware.js`

当前已有：

- `verifyToken`
- `checkRole(...roles)`

V2 建议设计：

| 中间件/工具 | 建议文件 | 职责 |
|---|---|---|
| `requireAuth` | `middlewares/authMiddleware.js` | `verifyToken` 的语义化别名或替代名：解析 token，写入 `req.user`，未登录返回 401。 |
| `requireRole([...])` | `middlewares/authMiddleware.js` | `checkRole` 的数组版：校验当前用户是否属于允许角色，失败返回 403。 |
| `resolveOrderScope` | `middlewares/orderScopeMiddleware.js` 或 `middlewares/authMiddleware.js` | 根据 `req.user.role`、请求路径和受限 `req.query.scope` 解析最终后端 scope，写入 `req.orderScope` 和 `req.orderQuery`。 |
| `assertOrderAccess(order, user)` | `utils/orderAccess.js` | 单订单访问判断：详情、取消、状态变更、派单前统一校验。 |

### 6.1 `requireAuth`

职责：

- 从 `Authorization` header 解析 Bearer token。
- 校验 JWT。
- 写入 `req.user = { userId, phone, role }`。
- 未登录返回 401。

使用接口：

- 所有 `/api/order/*`
- 所有 `/api/admin/*`
- 所有 `/api/driver/*`

### 6.2 `requireRole([...])`

职责：

- 限制接口入口角色。
- 不处理订单归属。
- 不根据前端 scope 放权。

使用接口：

- `/api/admin/orders/:id/assign`：`staff/dispatcher/admin/super_admin`
- `/api/admin/orders/:id/status`：`staff/dispatcher/admin/super_admin`
- `/api/order/start`：`driver`
- `/api/order/complete`：`driver`
- `/api/order/passenger-cancel`：`user/passenger`

### 6.3 `resolveOrderScope`

职责：

- 接受前端传入的 `scope` 作为“请求视图”。
- 根据角色白名单决定最终 scope。
- 生成后端查询条件，写入 `req.orderQuery`。
- 对非法 scope 返回 403 或回落默认 scope，建议 V2 早期用 403 更清晰。

避免前端伪造 scope：

- 乘客请求 `admin_all`：强制拒绝或降级为 `passenger_mine`。
- 司机请求 `dispatch_pool`：拒绝。
- staff 请求 `admin_all`：拒绝，除非用户同时有 admin 权限。
- admin 请求任意 scope：允许，但仍记录审计。

### 6.4 `assertOrderAccess(order, user)`

职责：

- 对单条订单进行最终访问判定。
- 不信任列表查询结果。
- 所有 detail/action 接口再次调用，避免 ID 猜测访问。

建议判断：

- passenger：`order.userId === user.userId`
- driver：`order.driverId === user.userId || order.assignedDriver === user.userId`
- staff：`order.ownerStaffId === user.userId || order.staffGroupId in user.staffGroupIds || dispatch_pool 条件`
- dispatcher：同 staff，但可拥有派单权限
- admin/super_admin：允许

## 七、前端改造范围

### 7.1 乘客端

| 页面/模块 | 改造内容 | 阶段 |
|---|---|---|
| 订单列表 / 历史 | 不传 `userId`，只调用后端默认 `passenger_mine` | V2 必做 |
| 订单详情 | 使用详情接口，后端校验本人订单；前端处理 403 | V2 必做 |
| 取消订单 | 保持现有按钮条件 `pending/assigned`，失败时展示后端错误 | V2 必做 |
| 多乘客账号切换测试 | 验证 A/B 数据隔离 | V2 必做 |

### 7.2 司机端

| 页面/模块 | 改造内容 | 阶段 |
|---|---|---|
| 接单列表 | 默认展示 `driver_assigned`，不展示全量 pending 池 | V2 必做 |
| 行程中 | 详情和操作都必须由后端校验当前司机 | V2 必做 |
| 历史订单 | 使用 `driver_assigned` + 终态过滤，不通过前端伪造 scope 扩权 | V2 必做 |
| 待抢单池 | 如要恢复抢单池，应设计独立 `driver_pool`，不在 V2 首轮做 | V2.1 后续增强 |

### 7.3 管理端

| 页面/模块 | 改造内容 | 阶段 |
|---|---|---|
| 待派单池 | 使用 `dispatch_pool`，只展示 `pending` 且未分配司机订单 | V2 必做 |
| 我的订单 | 使用 `staff_mine`，依赖 `ownerStaffId` | V2 必做 |
| 组内订单 | 使用 `staff_group`，依赖 `staffGroupId` | V2 必做或灰度 |
| 全部订单 | 只对 `admin/super_admin` 显示 `admin_all` | V2 必做 |
| 指派司机 | 派单接口写入 `assignedByStaffId/ownerStaffId/staffGroupId` | V2 必做 |
| 权限管理 UI | 管理 staff/dispatcher/admin/super_admin | V2.1 后续增强 |
| 组织/组管理 UI | 管理 staffGroup | V2.1 后续增强 |

## 八、迁移方案

V1 已有订单数据，迁移必须平滑。

### 8.1 旧订单缺少 `ownerStaffId`

策略：

- 不强制补值。
- 旧订单默认不进入 `staff_mine`。
- 旧订单仍可通过 `admin_all` 被管理员看到。
- 后续客服首次处理旧订单时，可将当前客服写入 `ownerStaffId`。

### 8.2 旧订单缺少 `staffGroupId`

策略：

- 不强制补值。
- 旧订单默认不进入 `staff_group`。
- 管理员可在异常处理页补归属组。
- 如果有明确规则，例如按司机团队或客服账号分组，可通过可重复迁移脚本补值。

### 8.3 `driverId / passengerId` 校验

当前没有 `passengerId`，使用 `userId`。

校验策略：

- `userId` 必须引用存在且 `role=user` 的用户。
- `driverId` 非空时必须引用存在且 `role=driver` 的用户。
- `assignedDriver` 非空时也必须引用存在且 `role=driver` 的用户。
- 如果 `driverId` 与 `assignedDriver` 不一致，迁移脚本只报告，不自动覆盖，避免误伤。

### 8.4 是否需要迁移脚本

需要，但必须分两类：

1. 只读检查脚本：
   - 统计缺少 `ownerStaffId/staffGroupId` 的订单。
   - 统计 `driverId/assignedDriver/userId` 引用无效的订单。
   - 输出 CSV/JSON 报告，不修改数据。

2. 可重复执行补值脚本：
   - 只对字段为空的订单补值。
   - 每次执行输出 `matched/updated/skipped/errors`。
   - 不删除订单，不清空字段。
   - 对无法推断归属的订单跳过，保留 admin 兜底。

### 8.5 旧订单 fallback

允许旧订单 fallback 为 `admin_all` 可见。

不建议让旧订单默认对所有 staff 可见。更安全的方案：

- admin/super_admin 全部可见。
- staff 只看已补 `ownerStaffId/staffGroupId` 的旧订单。
- 未补归属的旧订单进入“待归属处理”管理视图，只对 admin/super_admin 可见。

## 九、实施顺序

### Phase 0：只读扫描

目标：

- 不改代码，不改数据。
- 扫描现有订单、用户、司机、客服关系字段现状。

修改文件：

- 无业务代码修改。
- 可新增只读报告文档或只读脚本。

验收标准：

- 输出订单字段缺口统计。
- 输出角色分布统计。
- 输出无效 `userId/driverId/assignedDriver` 统计。

回滚方式：

- 无数据写入，无需回滚。

### Phase 1：补字段但不启用强权限

目标：

- 在 `Order` 中新增 `assignedByStaffId/ownerStaffId/staffGroupId` 可空字段。
- 派单时开始写入新字段。
- 列表仍保持 V1 兼容。

修改文件：

- `CNber_backend/models/Order.js`
- `CNber_backend/controllers/adminController.js`
- 可选新增只读迁移脚本。

验收标准：

- V1 主链路仍 PASS。
- 新派单订单写入 `assignedByStaffId`。
- 老订单不受影响。

回滚方式：

- 停止读取新字段。
- 新增字段可保留为空，不影响旧逻辑。

### Phase 2：司机 scope

目标：

- 司机端严格只看分配给自己的订单。
- 详情、接单、开始、完成均校验司机归属。

修改文件：

- `CNber_backend/middlewares/orderScopeMiddleware.js`
- `CNber_backend/utils/orderAccess.js`
- `CNber_backend/routes/order.js`
- `CNber_backend/controllers/orderController.js`

验收标准：

- 司机 A 看不到司机 B 订单。
- 司机 A 可正常完成自己的 assigned 订单。
- V1 主链路 PASS。

回滚方式：

- 关闭 `driver_assigned` 新中间件。
- 回退到 V1 `driverId` 查询逻辑。

### Phase 3：乘客 scope

目标：

- 乘客列表和详情严格本人订单。
- 取消订单仍仅允许本人 `pending/assigned`。

修改文件：

- `CNber_backend/controllers/orderController.js`
- `CNber_backend/utils/orderAccess.js`
- 乘客端只处理 403 展示，不改变业务流。

验收标准：

- 乘客 A 看不到乘客 B 订单。
- 乘客 A 可取消自己的 pending/assigned 订单。
- 未登录访问订单返回 401。

回滚方式：

- 回退到 V1 `userId` 过滤逻辑。

### Phase 4：客服 scope

目标：

- staff/dispatcher 根据 `staff_mine/staff_group/dispatch_pool` 查看订单。
- staff 不再默认拥有全部订单视图。

修改文件：

- `CNber_backend/models/User.js` 或新增 staff profile/group 设计。
- `CNber_backend/middlewares/orderScopeMiddleware.js`
- `CNber_backend/controllers/adminController.js`
- 管理端订单列表视图。

验收标准：

- 客服能看到待派单池。
- 客服能看到自己负责订单。
- 客服看不到非自己/非组内订单。
- admin 仍能看到全部订单。

回滚方式：

- staff 临时降级使用 `dispatch_pool`。
- admin_all 兜底处理所有订单。

### Phase 5：管理员全部订单

目标：

- 明确 `admin/super_admin` 的 `admin_all` 权限。
- 管理员拥有处理旧订单、异常订单、未归属订单的兜底入口。

修改文件：

- 管理端订单列表筛选。
- 后端 scope 白名单。
- 统计接口可选按 admin_all 聚合。

验收标准：

- admin 能看到全部订单。
- staff 不能请求 admin_all。
- super_admin 能管理角色或为后续角色管理预留入口。

回滚方式：

- 保持当前 V1 admin 全量逻辑。

### Phase 6：清理旧兼容逻辑

目标：

- 删除已无用的兼容分支。
- 统一 `driverId/assignedDriver` 语义。
- 收敛旧 scope、旧 admin 全量入口的临时逻辑。

修改文件：

- 按 Phase 0-5 的验收结果决定。

验收标准：

- 全部 V2 验收用例 PASS。
- 没有未使用 scope。
- 没有前端依赖越权参数。

回滚方式：

- 必须在清理前打 tag。
- 保留上一个兼容版本分支。

## 十、验收用例

| 编号 | 用例 | 预期 |
|---|---|---|
| 1 | 乘客 A 创建订单后访问订单列表 | 只能看到乘客 A 自己的订单 |
| 2 | 乘客 B 使用自己的 token 请求乘客 A 订单详情 | 返回 403 或不可见 |
| 3 | 司机 A 查看订单列表 | 只能看到分给司机 A 的订单 |
| 4 | 司机 B 请求司机 A 的订单详情或开始行程 | 返回 403 或业务错误 |
| 5 | 客服访问待派单订单池 | 能看到 `pending` 且未分配司机的订单 |
| 6 | 客服派单后 | 订单进入对应司机的 `assigned` 列表 |
| 7 | admin 访问管理端订单列表 | 能看到全部订单 |
| 8 | 未登录用户访问订单接口 | 返回 401 |
| 9 | 普通乘客访问 `/api/admin/orders` | 返回 403 |
| 10 | 司机访问客服派单接口 | 返回 403 |

补充验收：

- 旧订单缺少 `ownerStaffId/staffGroupId` 时，admin 仍可见。
- staff 请求 `scope=admin_all` 不生效或返回 403。
- 前端篡改 `userId/driverId` 不影响后端实际权限。

## 十一、风险清单

| 风险 | 描述 | 缓解方式 |
|---|---|---|
| 误伤 V1 主链路 | 强权限上线后，客服/司机/乘客看不到必要订单 | 分阶段灰度；每阶段跑 V1 主链路验收 |
| 前端传 scope 被伪造 | 用户手动传 `scope=admin_all` | 后端 `resolveOrderScope` 按角色白名单解析 |
| 老订单字段为空 | `ownerStaffId/staffGroupId` 缺失导致 staff 看不到旧订单 | admin_all 兜底；迁移脚本可重复补值 |
| 多端接口不一致 | 乘客端、司机端、管理端使用不同路径和状态理解 | 建立统一 scope 表和状态映射表 |
| 权限过严导致订单不可见 | staff 或 dispatcher 误配置后无法处理订单 | 管理员兜底入口；未归属订单视图 |
| 管理员兜底入口缺失 | 异常订单无人可见 | 保留 `admin_all`，只对 admin/super_admin 开放 |
| `driverId/assignedDriver` 语义重叠 | 查询可能漏单或重复 | 过渡期使用 `$or`，后续 Phase 6 收敛 |
| staff 角色尚未存在 | 当前 User role 只有 user/driver/admin | 先设计，Phase 1/4 分阶段扩展 |
| 组模型缺失 | `staffGroupId` 无引用模型 | 先可空字段，V2.1 再引入 StaffGroup |
| 统计口径变化 | 管理端统计可能从全量变成局部 | V2 首轮不改统计或明确按角色统计 |

## 十二、最终输出格式

### 12.1 总体方案

V2 通过后端统一解析 order scope，实现“同一个接口，不同角色得到不同合法订单范围”。前端可以选择视图，但不能决定权限。V1 主链路保留，新增字段先写入不强制读取，再逐步启用司机、乘客、客服 scope。

### 12.2 数据模型建议

| 模型 | 建议 |
|---|---|
| `Order.userId` | 复用为乘客归属，不新增 `passengerId` |
| `Order.driverId` | 复用为司机归属 |
| `Order.assignedDriver` | 保留兼容，后续收敛 |
| `Order.assignedByStaffId` | 最小新增，可空，记录派单人 |
| `Order.ownerStaffId` | 最小新增，可空，记录负责客服 |
| `Order.staffGroupId` | 最小新增，可空，记录所属客服组 |
| `Order.status` | 复用，不新增复杂状态 |
| `User.role` | 从 `user/driver/admin` 扩展到 `user/driver/staff/dispatcher/admin/super_admin` |

### 12.3 API Scope 表格

| Scope | API | 角色 | 条件 |
|---|---|---|---|
| `passenger_mine` | `GET /api/order/list` | user/passenger | `userId = uid` |
| `driver_assigned` | `GET /api/order/list` | driver | `driverId = uid OR assignedDriver = uid` |
| `dispatch_pool` | `GET /api/admin/orders` | staff/dispatcher/admin | `status=pending AND driverId=null` |
| `staff_mine` | `GET /api/admin/orders` | staff/dispatcher | `ownerStaffId = uid` |
| `staff_group` | `GET /api/admin/orders` | staff/dispatcher/admin | `staffGroupId in user groups` |
| `admin_all` | `GET /api/admin/orders` | admin/super_admin | `{}` |

### 12.4 权限矩阵表格

| 动作 | passenger | driver | staff | dispatcher | admin | super_admin |
|---|---:|---:|---:|---:|---:|---:|
| 创建订单 | 是 | 否 | 否 | 否 | 否 | 否 |
| 看自己订单 | 是 | 是 | 是 | 是 | 是 | 是 |
| 看组内订单 | 否 | 否 | 是 | 是 | 是 | 是 |
| 看全部订单 | 否 | 否 | 否 | 否 | 是 | 是 |
| 查看待派单池 | 否 | 否 | 是 | 是 | 是 | 是 |
| 指派司机 | 否 | 否 | 受限 | 是 | 是 | 是 |
| 司机接单 | 否 | 是 | 否 | 否 | 否 | 否 |
| 开始/完成行程 | 否 | 是 | 否 | 否 | 否 | 否 |
| 乘客取消 | 是 | 否 | 否 | 否 | 否 | 否 |
| 客服取消 | 否 | 否 | 受限 | 是 | 是 | 是 |
| 管理角色 | 否 | 否 | 否 | 否 | 受限 | 是 |

### 12.5 前端页面改造表

| 端 | 页面/模块 | V2 必做 | V2.1 增强 |
|---|---|---|---|
| 乘客端 | 订单列表 | 使用后端默认 passenger_mine | 高级筛选 |
| 乘客端 | 订单详情 | 处理 403 和空态 | 多订单详情审计 |
| 乘客端 | 取消订单 | 保持现有取消按钮，依赖后端权限 | 取消原因 |
| 司机端 | 接单列表 | driver_assigned | 独立抢单池 |
| 司机端 | 行程中 | 当前司机校验 | 轨迹/异常上报 |
| 司机端 | 历史订单 | driver_assigned + 终态 | 收入联动 |
| 管理端 | 待派单池 | dispatch_pool | 智能派单 |
| 管理端 | 我的订单 | staff_mine | SLA 提醒 |
| 管理端 | 组内订单 | staff_group | 组统计 |
| 管理端 | 全部订单 | admin_all 仅 admin | 高级审计 |
| 管理端 | 指派司机 | 写入归属字段 | 多调度策略 |

### 12.6 分阶段实施计划

实施顺序：

1. Phase 0：只读扫描。
2. Phase 1：补字段但不启用强权限。
3. Phase 2：司机 scope。
4. Phase 3：乘客 scope。
5. Phase 4：客服 scope。
6. Phase 5：管理员全部订单。
7. Phase 6：清理旧兼容逻辑。

每个阶段必须独立验收，任何阶段失败都回滚该阶段，不影响 V1 主链路。

### 12.7 验收 Checklist

- [ ] 乘客 A 只能看到自己的订单。
- [ ] 乘客 B 看不到乘客 A 的订单。
- [ ] 司机 A 只能看到分给自己的订单。
- [ ] 司机 B 看不到司机 A 的订单。
- [ ] 客服能看到待派单订单池。
- [ ] 客服派单后订单进入司机 assigned 列表。
- [ ] admin 能看到全部订单。
- [ ] 未登录用户不能访问订单。
- [ ] 普通乘客不能访问 admin 接口。
- [ ] 司机不能访问客服派单接口。
- [ ] V1 主链路仍完整 PASS。
- [ ] 旧订单缺少新字段时 admin 仍可见。
- [ ] 前端伪造 scope 不会越权。

### 12.8 不建议现在做的内容

V2 首轮不建议做：

- 不建议一次性重构所有订单接口。
- 不建议删除 `assignedDriver` 或立刻统一 `driverId/assignedDriver`。
- 不建议上线复杂组织架构和多层级审批。
- 不建议让前端直接传 `userId/driverId/staffId` 控制权限。
- 不建议直接强制迁移旧订单归属。
- 不建议清空旧订单或重建订单集合。
- 不建议把统计接口和报表 scope 一次性全部改造。
- 不建议在未完成验收前移除 `admin_all` 兜底。

