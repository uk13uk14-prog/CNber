# CNber 提交前差异审查

> 审查时间：2026-04-29  
> 审查范围：当前可见 194 项 Git 变更  
> 执行原则：只读审查；未执行 `git add`、`git commit`、`git reset`、`git clean`，未删除文件，未修改后端/乘客端/司机端/管理端业务代码。
> 备注：生成本报告后，工作区会额外增加 `PRE_COMMIT_REVIEW.md` 这一项未跟踪文件，因此复查总数会从 194 变为 195。

## 1. 当前 Git 状态汇总

| 类型 | 数量 |
|------|------|
| modified | 54 |
| deleted | 33 |
| untracked | 107 |
| 合计 | 194 |

低风险噪音复查：

| 类型 | 当前可见数量 | 结论 |
|------|--------------|------|
| `node_modules` | 0 | 已从待提交视图中排除 |
| `unpackage` / `dist` / `build` / `.vite` | 0 | 已从待提交视图中排除 |
| `logs` / `*.log` | 0 | 已从待提交视图中排除 |
| `tree.txt` / `123tree.txt` / `structure.txt` | 0 | 已从待提交视图中排除 |

## 2. `.gitignore` 审查

结论：`.gitignore` 当前规则只覆盖依赖、构建产物、日志、环境文件、本地 IDE 配置和临时检查文件，未覆盖业务源码目录。

当前规则范围：

- 依赖：`node_modules/`、`**/node_modules/**`
- 构建产物与缓存：`dist/`、`build/`、`unpackage/`、`.vite/`、`.cache/`、`cache/`、`coverage/` 及对应递归规则
- 日志：`logs/`、`*.log`、`**/logs/**`、`**/*.log`
- 环境文件：`.env`、`.env.*`，保留 `!.env.example`
- 本地工具：`.vscode/`、`.hbuilderx/`、`.DS_Store`、`*.local`
- 临时检查文件：`tree.txt`、`123tree.txt`、`structure.txt`

建议：`.gitignore` 可作为第一组低风险变更提交。

## 3. `CNber_backend/.env` 审查

结论：禁止提交。

只扫描键名与是否有值，未记录具体值。结果：

| Key | 是否有值 | 风险 |
|-----|----------|------|
| `PORT` | 是 | 低 |
| `JWT_SECRET` | 是 | 高，密钥 |
| `MONGO_URL` | 是 | 高，数据库连接 |
| `VITE_API_BASE_URL` | 是 | 中，环境地址 |

处理建议：

- `CNber_backend/.env` 必须列入禁止提交。
- 如需共享配置结构，应新增或维护 `.env.example`，只写占位值。
- 提交前必须确认 `.env` 不在 staged 区。

## 4. `CNber_admin_console_v1.0` 审查

结论：具备正式管理端最小结构，可作为“新版 uni-app 运营调度控制台”候选提交，但需人工确认它是否为最终正式管理端。

已具备的最小结构：

- 入口与项目配置：`App.vue`、`main.js`、`index.html`、`manifest.json`、`pages.json`、`package.json`
- 页面：登录、工作台、订单列表、订单详情、指派司机、跟进备注、司机列表、客户列表、司机详情、客户详情、设置
- 组件：订单卡片、司机卡片、统计卡片、状态徽章、跟进备注项、订单摘要、区块标题
- 服务层：`auth`、`order`、`driver`、`customer`、`stats`
- 配置层：API、菜单、订单状态、服务类型、司机展示
- 工具与状态：`utils/`、`store/session.js`
- 样式与资源：`styles/theme.scss`、`uni.scss`、`static/tab/`
- 文档：`README_ADMIN_UI.md` 明确其定位为客服 / 调度 / 运营后台 UI，核心闭环为看单、详情、指派司机、跟进备注、状态维护。

【需人工确认】是否以 `CNber_admin_console_v1.0` 作为正式管理端提交。  
【需人工确认】`CNber_admin_web_v1.0` 是否仍需同时保留，避免两个管理端职责重叠。

## 5. Modified 文件审查

### 后端 `CNber_backend`

以下属于业务源码 / 项目配置 / 开发辅助文件，需逐项复核后提交：

- `CNber_backend/controllers/authController.js`
- `CNber_backend/controllers/driverController.js`
- `CNber_backend/controllers/orderController.js`
- `CNber_backend/controllers/userController.js`
- `CNber_backend/models/Order.js`
- `CNber_backend/models/User.js`
- `CNber_backend/routes/auth.js`
- `CNber_backend/routes/driver.js`
- `CNber_backend/routes/order.js`
- `CNber_backend/routes/user.js`
- `CNber_backend/server.js`
- `CNber_backend/package.json`
- `CNber_backend/package-lock.json`
- `CNber_backend/test.js`
- `CNber_backend/API文档.md`
- `CNber_backend/CNber_backend.postman_collection.json`

禁止提交：

- `CNber_backend/.env`

判断：后端 modified 文件大多属于业务源码或接口文档，`package*.json` 属于依赖/脚本配置，`test.js` 属于测试辅助文件；但 `.env` 含密钥和数据库连接，禁止提交。

### 乘客端 `CNber_client_admin_v1.0`

以下属于业务源码：

- `CNber_client_admin_v1.0/config/api.js`
- `CNber_client_admin_v1.0/pages/A0002_client_login_v01.vue`
- `CNber_client_admin_v1.0/pages/A0003_client_register_v01.vue`
- `CNber_client_admin_v1.0/pages/A0102_client_order_pickup_v01.vue`
- `CNber_client_admin_v1.0/pages/A0103_client_order_dropoff_v01.vue`
- `CNber_client_admin_v1.0/pages/A0104_client_order_point_v01.vue`
- `CNber_client_admin_v1.0/pages/A0105_client_order_charter_v01.vue`
- `CNber_client_admin_v1.0/pages/A0107_client_wait_driver_v01.vue`
- `CNber_client_admin_v1.0/pages/A0109_client_driver_info_v01.vue`
- `CNber_client_admin_v1.0/pages/A0110_client_in_trip_v01.vue`
- `CNber_client_admin_v1.0/pages/A0111_client_trip_completed_v01.vue`
- `CNber_client_admin_v1.0/pages/A0201_client_rating_v01.vue`
- `CNber_client_admin_v1.0/pages/A0202_client_order_history_v01.vue`
- `CNber_client_admin_v1.0/pages/A0300_client_main_v01.vue`
- `CNber_client_admin_v1.0/pages/A0303_client_change_password_v01.vue`
- `CNber_client_admin_v1.0/pages/A0405_client_help_register_v01.vue`
- `CNber_client_admin_v1.0/pages/A0406_client_help_login_v01.vue`
- `CNber_client_admin_v1.0/pages/A0407_client_help_usage_v01.vue`

判断：均为乘客端页面或 API 配置，属于业务源码。提交前建议按“登录/下单/订单状态/评价/帮助页”分组复核。

### 司机端 `CNber_driver_admin_v1.0`

以下属于业务源码：

- `CNber_driver_admin_v1.0/App.vue`
- `CNber_driver_admin_v1.0/config/api.js`
- `CNber_driver_admin_v1.0/pages.json`
- `CNber_driver_admin_v1.0/pages/D0001_driver_welcome.vue`
- `CNber_driver_admin_v1.0/pages/D0002_driver_login.vue`
- `CNber_driver_admin_v1.0/pages/D0101_driver_order_list.vue`
- `CNber_driver_admin_v1.0/pages/D0102_driver_order_detail.vue`
- `CNber_driver_admin_v1.0/pages/D0103_driver_trip_tracking.vue`
- `CNber_driver_admin_v1.0/pages/D0201_driver_income_center.vue`
- `CNber_driver_admin_v1.0/pages/D0202_driver_withdraw.vue`
- `CNber_driver_admin_v1.0/pages/D0203_driver_invoice_history.vue`
- `CNber_driver_admin_v1.0/pages/D0300_driver_main.vue`
- `CNber_driver_admin_v1.0/pages/D0303_driver_trip_history.vue`
- `CNber_driver_admin_v1.0/pages/D0503_driver_settings.vue`
- `CNber_driver_admin_v1.0/pages/D0601_driver_loading.vue`
- `CNber_driver_admin_v1.0/styles/tokens.scss`

判断：均为司机端入口、路由、页面、配置或样式令牌，属于业务源码。提交前建议按“登录/订单/行程/收入/设置/样式”分组复核。

### 其他 modified

- `.gitignore`：可提交，属于低风险仓库规则修正。
- `_deprecated_CNber_server_v1.0/README.md`：【需人工确认】废弃目录文档是否仍需维护。
- `前端联调测试清单.md`：【需人工确认】是否作为验收文档提交；当前 Git 输出为转义路径，但文件名应核对。

## 6. 旧 `CNber_admin_web` deleted 审查

结论：33 个 deleted 文件保持【待确认】，本轮不得处理。

待确认删除列表：

- `CNber_admin_web/.env.development`
- `CNber_admin_web/App.vue`
- `CNber_admin_web/index.html`
- `CNber_admin_web/main.js`
- `CNber_admin_web/package-lock.json`
- `CNber_admin_web/package.json`
- `CNber_admin_web/public/favicon.ico`
- `CNber_admin_web/src/App.vue`
- `CNber_admin_web/src/components/TableCard.vue`
- `CNber_admin_web/src/main.js`
- `CNber_admin_web/src/router/guard.js`
- `CNber_admin_web/src/router/index.js`
- `CNber_admin_web/src/store/auth.js`
- `CNber_admin_web/src/utils/request.js`
- `CNber_admin_web/src/views/403.vue`
- `CNber_admin_web/src/views/404.vue`
- `CNber_admin_web/src/views/AI_Logs.vue`
- `CNber_admin_web/src/views/AdminLogin.vue`
- `CNber_admin_web/src/views/Alumni.vue`
- `CNber_admin_web/src/views/Analytics.vue`
- `CNber_admin_web/src/views/Dashboard.vue`
- `CNber_admin_web/src/views/Drivers.vue`
- `CNber_admin_web/src/views/Login.vue`
- `CNber_admin_web/src/views/MobileDashboard.vue`
- `CNber_admin_web/src/views/Orders.vue`
- `CNber_admin_web/src/views/Roles.vue`
- `CNber_admin_web/src/views/Tickets.vue`
- `CNber_admin_web/src/views/Users.vue`
- `CNber_admin_web/src/views/admin/DriverList.vue`
- `CNber_admin_web/src/views/finance/FinanceList.vue`
- `CNber_admin_web/src/views/service/OrderView.vue`
- `CNber_admin_web/static/logo.png`
- `CNber_admin_web/vite.config.js`

【需人工确认】只有确认旧管理端已废弃，且由 `CNber_admin_console_v1.0` 或 `CNber_admin_web_v1.0` 替代后，才可单独提交这些删除。

## 7. 不应提交的文件

禁止提交：

- `CNber_backend/.env`：包含 `JWT_SECRET`、`MONGO_URL` 等敏感配置。
- 任何 `.env`、`.env.*`，除明确脱敏的 `.env.example`。
- 任何日志、依赖、构建产物、缓存：当前已不可见，但提交前仍需复查。
- `CNber_admin_web/.env.development`：即使当前表现为 deleted，也属于环境配置，处理旧目录时需谨慎。

需人工确认后再决定：

- `order.js`：根目录临时脚本或正式工具属性不明。
- `_deprecated_CNber_server_v1.0/README.md`：废弃目录文档。
- `前端联调测试清单.md`：是否属于正式验收资料。
- `CNber_admin_web_v1.0/`：是否与 `CNber_admin_console_v1.0` 同时保留。
- `CNber_client_admin_v1.0/old/pages.json`：旧配置文件，可能是备份。
- `CNber_backend/test.js`、`CNber_backend/scripts/createTestAccounts.js`：测试辅助脚本，提交前确认是否允许进入版本。

## 8. 可立即提交

可立即提交的低风险项：

- `.gitignore`
- `GIT_CLEANUP_PLAN.md`
- `PRE_COMMIT_REVIEW.md`

可提交但建议单独成组：

- `TEST_FLOW_CHECKLIST.md`
- `TEST_EXECUTION_LOG.md`
- `BUG_TRIAGE_GUIDE.md`

可提交但需先确认产品/版本策略：

- `CNber_admin_console_v1.0/` 新版管理端完整目录。

## 9. 禁止提交

- `CNber_backend/.env`
- 任何真实 `.env` 文件
- 任何日志、依赖、构建产物、缓存
- 未确认来源的临时脚本或测试垃圾文件
- 未确认废弃策略的旧 `CNber_admin_web` 删除

## 10. 需人工确认

- 【需人工确认】旧 `CNber_admin_web` 是否正式废弃。
- 【需人工确认】`CNber_admin_console_v1.0` 是否为正式管理端。
- 【需人工确认】`CNber_admin_web_v1.0` 是否保留，是否与 `CNber_admin_console_v1.0` 重复。
- 【需人工确认】`CNber_backend/.env` 是否需要改为 `.env.example` 方案。
- 【需人工确认】`order.js` 是否为临时脚本。
- 【需人工确认】`CNber_client_admin_v1.0/old/pages.json` 是否为备份垃圾文件。
- 【需人工确认】测试脚本、Postman 集合、API 文档是否随发布提交。

## 11. 建议提交顺序

1. 仓库卫生：提交 `.gitignore`、`GIT_CLEANUP_PLAN.md`、`PRE_COMMIT_REVIEW.md`。
2. 验收文档：提交测试清单、执行记录模板、缺陷分流指南。
3. 【需人工确认】新版管理端：提交 `CNber_admin_console_v1.0/`。
4. 后端业务变更：排除 `.env` 后，按接口/模型/路由/文档分组提交。
5. 乘客端业务变更：按登录、下单、订单状态、评价、帮助页分组提交。
6. 司机端业务变更：按登录、接单、行程、收入、设置分组提交。
7. 【需人工确认】旧管理端迁移：单独处理 `CNber_admin_web` 33 个 deleted 文件。

