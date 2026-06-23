# CNber 上线前完整体检报告

**检查日期：** 2026-06-01  
**检查范围：** `C:\Users\eulan\Documents\HBuilderProjects\CNber`（含 backend、admin web、三端 uni-app、sms、docs）  
**检查方式：** 运行约定命令 + 静态代码/配置审查（**未修改任何业务代码**）

---

## 1. 总体结论

| 维度 | 结论 |
|------|------|
| **是否可进入真机联调** | **有条件可以**：后端 P0 业务逻辑 smoke 已通过，乘客/司机端页面与 API 映射基本齐全；但 **管理 Web 生产包未同步到后端**、**smoke 未覆盖 HTTP/真机上传**，需先完成部署与局域网 API 配置后再联调。 |
| **是否可进入小规模试运营** | **暂不建议直接上线**：Blocker 含「`/admin` 静态资源缺失」；High 含「真机 API 默认 127.0.0.1」「CORS 全开」「register 无限流」「`driver_timeout` 无实现」。 |
| **P0 预约制闭环（逻辑层）** | **基本完整**：`npm run smoke:p0` → **PASS**（直连 MongoDB + 控制器，非全链路 HTTP）。 |

### 当前最大风险（Top 3）

1. **`CNber_backend/public/admin` 仅有 `.gitkeep`，未包含 `admin_web` 构建产物** → 生产访问 `/admin` 无法使用管理后台（部署 Blocker）。
2. **`smoke:p0` 不启动 HTTP 服务**，凭证使用外部 placeholder URL，**未验证** `payment-proof/upload`、`express.static`、`PUBLIC_BASE_URL` 在真机/反代下的可达性。
3. **uni-app 默认 `http://127.0.0.1:3100/api`**，真机必配 `UNI_APP_API_BASE_URL` 为宿主机局域网 IP，否则下单/列表/截图 URL 全部失败。

### 额外 Top 2（第 4–5 项风险）

4. **`app.use(cors())` 无来源限制**，生产环境跨域与凭证策略需收紧。  
5. **`POST /api/auth/register` 无限流**，与已限流的 login 不一致，存在滥注册风险。

---

## 2. 命令执行结果

### 2.1 CNber_backend

| 命令 | 结果 |
|------|------|
| `npm install` | ✅ 成功（149 packages） |
| `npm run smoke:p0` | ✅ **PASS**（订单 `CNB-20260601-002`，`platformProfit: 23.75`） |
| `npm audit` | ✅ **0** high/critical |

**smoke 说明：** `scripts/p0TrialFlowSmoke.js` 直连 MongoDB 调用控制器，**不经过 Express**；付款截图使用 `SMOKE_PROOF_IMAGE_URL` 或 placehold.co，**未测本地上传目录**。

### 2.2 CNber_admin_web_v1.0

| 命令 | 结果 |
|------|------|
| `npm install` | ✅ 成功 |
| `npm run build` | ✅ **PASS**（Vite 1.63s，`dist/` 已生成） |
| `npm audit` | ⚠️ **2 moderate**（`esbuild` / `vite` 开发服务器 CVE，**非生产运行时 RCE**；修复需 `npm audit fix --force` 大版本升级） |

**部署缺口：** 构建产物在 `CNber_admin_web_v1.0/dist/`，**未复制**到 `CNber_backend/public/admin/`（目录仅含 `.gitkeep`）。

### 2.3 CNber_sms_verification

| 命令 | 结果 |
|------|------|
| `npm install` | ✅ 成功 |
| `npm audit` | ✅ **0** high/critical |

### 2.4 uni-app 三端（CNber_client_admin / CNber_driver_admin / CNber_admin_console）

| 项目 | package.json | 标准 npm build |
|------|----------------|----------------|
| CNber_client_admin_v1.0 | ❌ 无 | **无**：HBuilderX / uni-app 工程，依赖 IDE「发行」；仅 `manifest.json` + 页面源码 |
| CNber_driver_admin_v1.0 | ❌ 无 | 同上 |
| CNber_admin_console_v1.0 | ✅ 有（仅元数据） | **无 build 脚本**；与 **CNber_admin_web_v1.0** 功能重叠，属旧版 uni 管理端 |

已检查：`config/api.js`、`utils/request.js`（乘客/司机）、`manifest.json`（三端均存在）。

---

## 3. P0 闭环状态表

| 模块 | 状态 | 风险 | 文件或接口 | 建议 |
|------|------|------|------------|------|
| 客户预约下单 | ✅ 已完成 | 低 | `POST /api/order/create`；`pages/A0102~A0105_*` | 真机确认 `UNI_APP_API_BASE_URL` |
| 后台报价/确认 | ✅ 已完成 | 低 | `adminController.quoteOrder`；管理 Web `OrderDetailView` | — |
| 客户真实转账入口 | ✅ 已完成 | 中 | `GET /api/payment/accounts`（公开）；`PaymentTransferFlow.vue` | 公开账户为试运营设计，上线前评估脱敏 |
| 上传付款截图 | ✅ 已完成 | **高** | `POST /api/order/:id/payment-proof/upload`；`paymentProofUpload.js` | 真机测 base64 上传 + `PUBLIC_BASE_URL` 回写 URL |
| 后台审核定金 | ✅ 已完成 | 低 | `PATCH/POST .../payment/deposit/confirm`；`/admin/payment-reviews` | — |
| 派司机 | ✅ 已完成 | 低 | `POST /api/admin/orders/:id/assign`；校验 `approved` + `isActive` + 定金已确认 | — |
| 司机接单 | ✅ 已完成 | 低 | `POST /api/order/accept` | — |
| 确认尾款 | ✅ 已完成 | 低 | `adminRequestBalance` → 客户 `submitBalance` → `adminConfirmBalance` | 管理 Web 订单详情需点「发起尾款」 |
| 开始行程 | ✅ 已完成 | 中 | `POST /api/order/start`（要求尾款已确认） | smoke 未显式经过 `ready_to_start` |
| 完成行程 | ✅ 已完成 | 低 | `POST /api/order/complete` | — |
| 财务对账 | ✅ 已完成 | 低 | `GET /api/admin/finance/*`；`FinancialView.vue`；`buildOrderFinanceSnapshot` | 与 smoke 毛利字段一致 |
| 司机结算 | ✅ 已完成 | 低 | `POST .../driver-settlement/confirm` | — |
| 运营结案 | ✅ 已完成 | 低 | `POST /api/admin/orders/:id/close`；`OrderDetailView` 按钮 | — |
| 管理 Web 生产托管 | ❌ 缺失 | **Blocker** | `server.js` → `/admin` → `public/admin` | build 后复制 dist 到 `public/admin` |
| 端到端 HTTP 回归 | ⚠️ 有风险 | **高** | 仅 `smoke:p0` 控制器级 | 部署后补 Postman/真机 E2E |
| 司机超时 `driver_timeout` | ❌ 缺失 | 中 | 枚举在 `Order.js`，**无设置逻辑/无 UI** | 试运营可人工处理，后续 cron 或后台按钮 |
| 统一部署文档 | ❌ 缺失 | 中 | 无 `docs/DEPLOY_FLOW.md`；仅有 `P0_TRIAL_OPS_LOOP.md` 片段 | 编写 DEPLOY_FLOW + pm2 示例 |

---

## 4. P0 必修复清单

### Blocker（不修不能真机/不能上线管理端）

| # | 问题 | 位置 |
|---|------|------|
| B1 | `CNber_backend/public/admin` 无构建产物，`/admin` SPA 不可用 | `public/admin/.gitkeep`；需 `cp -r CNber_admin_web_v1.0/dist/* public/admin/` |
| B2 | 真机/模拟器须配置 `UNI_APP_API_BASE_URL`（非 127.0.0.1） | `CNber_client_admin_v1.0/config/api.js`、`CNber_driver_admin_v1.0/config/api.js` |
| B3 | 部署后执行 **HTTP 级** smoke 或手工走通：上传截图 → 管理端打开 proof 链接 | `paymentProofUpload.js`、`PUBLIC_BASE_URL` |

### High（不修不能稳定真实接单）

| # | 问题 | 位置 |
|---|------|------|
| H1 | `register` 无限流 | `routes/auth.js` |
| H2 | CORS 默认允许所有来源 | `server.js` `app.use(cors())` |
| H3 | `.env.example` 缺少 `PUBLIC_BASE_URL`、无 `MONGO_URI` 别名说明 | `CNber_backend/.env.example` |
| H4 | `payment-proofs` 上传目录未加入 `.gitignore`（可能误提交用户凭证图） | 根 `.gitignore` |
| H5 | 嵌套 `order.payment.depositStatus` enum **不含** `submitted`/`rejected`，与顶层 `depositStatus` 双轨，易出现展示不一致 | `models/Order.js` `OrderPaymentSchema` vs `DEPOSIT_STATUSES` |

### Medium（可试运营但需跟进）

| # | 问题 | 位置 |
|---|------|------|
| M1 | `driver_timeout` 仅有枚举与 label，无 API/定时任务 | `p0Constants.js`、`p0Labels.js` |
| M2 | 司机端多个页面 `TODO`（钱包、资料、反馈等）非 P0 主路径 | `D0204`、`D0006`、`D0506` 等 |
| M3 | `CNber_admin_console_v1.0` 与 `admin_web` 并存，易混淆运维入口 | 文档标明以 Web 为准 |
| M4 | admin web `npm audit` 2 moderate（vite/esbuild dev） | 计划升级 vite 大版本 |
| M5 | 乘客 `confirmed` 状态落入 `wait` 流而非强制跳转支付页 | `clientOrderFlowSlot` in `orderStatus.js` |
| M6 | 无 `pm2` / M1 服务器标准流程文档 | 缺失 `DEPLOY_FLOW.md` |

### Low（后续优化）

| # | 问题 |
|---|------|
| L1 | 未挂载路由文件 `routes/ai.js`、`dashboard.js`、`alumni.js`、`logs.js`、`support.js` |
| L2 | `_deprecated_CNber_server_v1.0` 未引用，可归档 |
| L3 | 乘客/司机 `App.vue` 与 `config/api.js` 开发态 `console.log` |
| L4 | `paymentProofUpload` 未白名单 image 类型（仅解析 data URL 扩展名） |
| L5 | `IDEAL_POSTCODES_API_KEY` 在 example 中但 address 公开接口依赖外网 |

---

## 5. 状态机对照表

### 5.1 `Order.status`（主流程）

| 后端状态 | 管理 Web | 乘客端 | 司机端 | 风险 |
|----------|----------|--------|--------|------|
| `created` | ✅ | ✅ | ✅ | 低 |
| `quoted` | ✅ | ✅ | ✅ | 低 |
| `confirmed` | ✅ | ✅（wait 槽） | ✅ | 中：确认后需引导去定金页 |
| `deposit_paid` | ✅ | ✅ | ✅ | 低 |
| `assigned` | ✅ | ✅ | ✅ | 低 |
| `driver_accepted` | ✅ | ✅ | ✅（归一为 accepted） | 低 |
| `ready_to_start` | ✅ | ✅ | ✅（归一为 accepted） | 中：smoke 常跳过此态 |
| `in_progress` | ✅ | ✅ | ✅（归一为 started） | 低 |
| `arrived` | ✅ | ✅ | ✅ | 中：司机端无单独「到达」按钮，依赖后台或直跳 complete |
| `completed` | ✅ | ✅ | ✅ | 低 |
| `cancelled` | ✅ | ✅ | ✅ | 低 |
| `pending` / `accepted` / `started` | ✅ 兼容标签 | ✅ 别名 | ✅ 归一 | 低：旧数据兼容 |

### 5.2 支付与运营字段

| 字段 | 后端枚举 | 管理 Web | 乘客端 | 司机端 | 风险 |
|------|----------|----------|--------|--------|------|
| `depositStatus` | unpaid/pending/submitted/confirmed/rejected/refunded | ✅ 审核中心 | ✅ 支付页 | 间接 | 嵌套 `payment.depositStatus` 仅 unpaid/pending/confirmed |
| `balanceStatus` | 同上 | ✅ | ✅ | 间接 | 同上 |
| `paymentStage` | none → … → completed | 订单详情 | 等待页 | — | 低 |
| `settlementStatus` | unsettled/partially_settled/settled | ✅ 财务 | — | — | 低 |
| `serviceStatus` | active/on_hold/exception/dispute/closed | ✅ SOP | 弱展示 | — | 低 |
| `driverSettlementStatus` | not_required/pending/paid | ✅ | — | — | 低 |
| `exceptionType` | 9 种 | ✅ label + 操作按钮 | 历史页弱展示 | — | `driver_timeout` 无写入路径 |

### 5.3 中文 label 一致性（抽样）

| 状态 | 管理 Web | 乘客端 | 司机端 |
|------|----------|--------|--------|
| `confirmed` | 客户确认报价 | 已确认 | 已确认 |
| `assigned` | 已指派司机 | 已派单 | 已指派 |
| `driver_accepted` | 司机已接单 | 司机已接单 | 已接单（归一后） |

整体一致；乘客语气更口语，可接受。

---

## 6. API / 页面映射表（P0 关键路径）

| 步骤 | 乘客端页面 | 司机端页面 | 管理 Web | API |
|------|------------|------------|----------|-----|
| 下单 | `A0102~A0105` | — | — | `POST /api/order/create` |
| 等报价/确认 | `A0107` | — | `orders/:id` | `POST /order/confirm-price` |
| 付定金 | `A0106` | — | `payment-reviews` | `GET /api/payment/accounts`；`POST .../payment-proof/upload`；`POST .../deposit/submit` |
| 审定金 | — | — | `payment-reviews` / 订单详情 | `POST /admin/orders/:id/deposit/confirm` |
| 派单 | — | `D0300` / `D0101` | `orders/:id/dispatch` | `POST /admin/orders/:id/assign` |
| 接单 | `A0109` | `D0102` | — | `POST /api/order/accept` |
| 尾款 | `A0106b` | — | 订单详情发起 | `POST .../balance/request`；`.../balance/submit`；`.../confirm` |
| 行程 | `A0110` | `D0102` | 订单详情 | `POST /api/order/start`；`POST /api/order/complete` |
| 历史 | `A0202` | `D0101` | `orders` | `GET /api/order/list` |
| 财务 | — | — | `finance` | `GET /admin/finance/summary` 等 |
| 司机审核 | — | — | `driver-onboarding` | `GET/PATCH /admin/drivers/...` |
| 收款配置 | — | — | `payment-settings` | `GET/POST /admin/payment-accounts` |
| 异常 | — | — | `OrderDetailView` P0 区 | `POST .../cancel|refund|dispute|exception|close` |

**鉴权摘要：**

- `/api/order/*`：`verifyToken`；列表按 role 过滤 userId/driverId ✅  
- `/api/admin/*`：`verifyToken` + `admin` ✅  
- `/api/driver/*`：driver role ✅  
- `/api/payment/accounts`：**公开 GET**（`server.js` 先于鉴权路由注册）⚠️  
- `/api/address/*`：**公开** lookup/search ⚠️（需 `IDEAL_POSTCODES_API_KEY`）  
- 上传凭证：`verifyToken` + 仅 `user` + 订单归属 ✅  

---

## 7. 分项检查摘要

### 7.1 支付闭环

- **PaymentAccount 新旧字段：** `normalizeLegacyAccount` 统一 `method`/`paymentType`、`accountNo`/`accountNumber` 等 ✅  
- **公开账户列表：** `paymentPublicController.listPublicAccounts` ✅  
- **乘客端：** `fetchPaymentAccounts` → `PaymentTransferFlow.vue` 展示真实账户 ✅  
- **审核字段：** `depositPaymentInfo.paymentMethod`、`paymentAccountId`、`proofImage` 写入与 `enrichOrderPayments` 展示 ✅  
- **payment-reviews：** `p0OperationsController.listPaymentReviews` + `PaymentReviewCenterView.vue` ✅  

### 7.2 图片上传与静态访问

- 目录：`public/uploads/payment-proofs`（运行时 `mkdir`）✅  
- 静态：`app.use('/uploads', express.static(...))` ✅  
- **`.gitignore`：** 未忽略 `public/uploads/**` ⚠️  
- **`PUBLIC_BASE_URL`：** 代码支持；**.env.example 未文档化** ⚠️  
- 限制：5MB、base64；**无 MIME 白名单** ⚠️  

### 7.3 环境配置

| 变量 | backend example | admin web example | uni-app |
|------|-----------------|-------------------|---------|
| `JWT_SECRET` | ✅ 必填（启动 throw） | — | — |
| `MONGO_URL` | ✅（非 MONGO_URI） | — | — |
| `VITE_API_BASE_URL` | — | `/api`（相对） | — |
| `UNI_APP_API_BASE_URL` | — | — | `.env.example` 127.0.0.1 |
| `PUBLIC_BASE_URL` | ❌ 未列入 example | — | — |

无 **192.168.x.x 写死**（仅注释示例）。

### 7.4 权限与安全

- JWT：启动强制 `JWT_SECRET` ✅；未发现硬编码生产密钥 ✅  
- 历史密钥：未发现提交在仓库（`.env` 已 ignore）✅  
- register：**无限流** ❌  
- CORS：**全开** ❌  

### 7.5 司机 onboarding

- 派单：`assignDriver` 检查 `verificationStatus === 'approved'` 且 `isActive !== false` ✅  
- 拒单：写 `exceptionType: driver_rejected`、`serviceStatus: exception` ✅  
- 司机端：**无** `verificationStatus` UI；未通过审核时靠接口 400 ⚠️  

### 7.6 财务字段（与 smoke 一致）

`buildOrderFinanceSnapshot` 提供：`customerTotal`、`depositPaid`、`balancePaid`、`driverPayable`、`driverPaid`、`platformProfit`、`unsettledAmount`、`refundAmount`、`settlementStatus`。  
smoke 报告 `platformProfit: 23.75` 与控制器计算路径一致 ✅  

### 7.7 异常订单

| exceptionType | 后端 API | 管理 Web 按钮 |
|---------------|----------|---------------|
| cancelled_by_* | `POST .../cancel` | ✅ |
| driver_rejected | 司机 `POST /order/reject` | 展示 |
| driver_timeout | — | 仅 label |
| price_changed | `POST .../change-price` | ✅ |
| refund_* | `POST .../refund` | ✅ |
| dispute_* | `POST .../dispute` | ✅ |
| 通用 | `POST .../exception` | ✅ |

### 7.8 死代码与未挂载路由

| 文件 | server.js 引用 | 建议 |
|------|----------------|------|
| `routes/ai.js` | ❌ | 归档或删除；内含无效 `router.post` 在 `module.exports` 之后 |
| `routes/dashboard.js` | ❌ | 归档 |
| `routes/alumni.js` | ❌ | 归档 |
| `routes/logs.js` | ❌ | 归档 |
| `routes/support.js` | ❌ | 归档 |
| `_deprecated_CNber_server_v1.0/` | ❌ | 保持 deprecated，勿部署 |

---

## 8. 部署一致性

| 检查项 | 状态 |
|--------|------|
| admin build → `CNber_backend/public/admin` | ❌ **未同步** |
| 后端托管 `/admin` | ✅ 代码已配置 |
| `docs/DEPLOY_FLOW.md` | ❌ **缺失** |
| `docs/P0_TRIAL_OPS_LOOP.md` 部署片段 | ✅ 有 copy dist 说明 |
| pm2 文档 | ❌ 未发现 |
| 部署后跑 `smoke:p0` | 建议在目标机 Mongo 上执行（仍非 HTTP） |

**推荐最小部署顺序（写入 DEPLOY_FLOW 时可照抄）：**

1. `CNber_backend`：配置 `.env`（`JWT_SECRET`、`MONGO_URL`、`PUBLIC_BASE_URL`）  
2. `CNber_admin_web_v1.0`：`npm run build` → 复制到 `CNber_backend/public/admin`  
3. `npm start`（或 pm2）  
4. 本机 `npm run smoke:p0`  
5. 真机配置 uni-app `UNI_APP_API_BASE_URL` → 手工走通定金上传  

---

## 9. 最终建议（下一步顺序）

1. **同步管理 Web 构建产物**到 `CNber_backend/public/admin`，验证 `http://<host>:3100/admin/login` 可打开。  
2. **编写 `docs/DEPLOY_FLOW.md`**：环境变量、dist 复制、pm2、部署后 smoke、真机 API 配置模板。  
3. **真机 E2E（HTTP）**：定金 base64 上传 → 管理端 payment-reviews 打开截图 → 派单 → 司机接单 → 尾款 → 完成 → 财务结算 → 结案。  
4. **配置 `PUBLIC_BASE_URL`** 为外网/局域网可访问根 URL，避免凭证链接指向 `localhost`。  
5. **安全加固（试运营前）**：register 限流、CORS 白名单、`.gitignore` 增加 `public/uploads/`。  
6. **中期待办**：实现或文档化 `driver_timeout`；清理未挂载 routes；统一 `order.payment` 与顶层支付状态枚举。

---

## 附录 A：检查环境

- OS：Windows 10  
- Node：项目本地 `npm install` 成功  
- MongoDB：smoke 使用 `mongodb://localhost:27017/cnber`（本机已连通）  
- 未检查：`node_modules` 内部、`_deprecated_*` 实现细节、`dist/`/`unpackage/` 内容（除 build 输出验证）

## 附录 B：相关文档索引

| 文档 | 用途 |
|------|------|
| `docs/P0_TRIAL_OPS_LOOP.md` | P0 链路与 API 清单 |
| `docs/P0_TRIAL_FLOW_SMOKE_TEST.md` | smoke 说明 |
| `docs/PRE_PRODUCTION_HARDENING_REPORT.md` | 历史加固记录 |
| `CNber_admin_web_v1.0/README.md` | 本地 dev 说明（生产需补 dist 同步） |

---

*本报告由自动化检查生成，未对仓库业务代码做任何修改。*
