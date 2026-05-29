# CNber 提交前人工闸门与最终分组确认

执行时间：2026-05-29

目标：提交前审查、风险隔离、生成最终可提交清单。不新增功能，不大改代码，不执行 `git commit` / `git push`。

## 1. 当前 Git 状态摘要

已执行：

```bash
git status --short
git diff --stat
```

摘要：

- `git status --short` 当前规模较大：`total=18850 modified=55 deleted=18767 added=1 untracked=27`。
- 大量 `deleted` 来自已执行的 `git rm --cached`：`.env`、`node_modules/`、`unpackage/` 等从 Git tracking 移出。
- 当前 `git diff --stat` 非依赖/非构建源码层面显示 `87 files changed, 3239 insertions(+), 3403 deletions(-)`。
- 本轮安全收口直接相关 diff 约 `18 files changed, 447 insertions(+), 209 deletions(-)`，不包含新增 `.env.example` 与 docs 统计。

关键状态：

```text
 M .gitignore
D  CNber_admin_web/.env.development
D  CNber_backend/.env
D  CNber_sms_verification/.env
 M CNber_backend/routes/order.js
?? CNber_admin_console_v1.0/.env.example
?? CNber_admin_web_v1.0/.env.example
?? CNber_backend/.env.example
?? CNber_client_admin_v1.0/.env.example
?? CNber_driver_admin_v1.0/.env.example
?? CNber_sms_verification/.env.example
?? PRICE_MATRIX_SEED.csv
?? PRICE_MATRIX_SEED.json
?? docs/GIT_CLEANUP_AND_COMMIT_PLAN.md
?? docs/PRE_PRODUCTION_HARDENING_REPORT.md
?? docs/admin-login.example.txt
?? order.js
```

## 2. 人工确认项审查

### A. 旧目录：`CNber_admin_web/`

检查结果：

- 当前非依赖跟踪文件约 32 个，包含 `package.json`、`vite.config.js`、路由、视图、登录页、订单页、司机页等旧管理端源码。
- 当前工作区表现为整目录删除，但这些删除不属于本次安全收口必要修改。
- 没有根级 `package.json` 引用它；当前可构建管理端是 `CNber_admin_web_v1.0`。
- 文档中多处提示旧目录是否废弃仍需人工确认。

建议：`ARCHIVE`

理由：

- 它看起来是旧版管理端，且新目录 `CNber_admin_web_v1.0` 已承担管理 Web 职责。
- 但旧目录包含未逐项比对的视图和路由，不能在安全收口提交中直接确认删除。
- 建议单独开迁移/归档 PR：确认功能已迁移后再从仓库删除或移动到归档位置。

本轮处理：

- 暂缓提交 `CNber_admin_web/` 相关删除。
- 仅可提交 `CNber_admin_web/.env.development` 的停止跟踪删除，因为它是敏感/本地环境文件。

### A. 旧目录：`_deprecated_CNber_server_v1.0/`

检查结果：

- `README.md` 明确写明“旧版后端 / 不再使用 / 主后端为 `CNber_backend`”。
- 非依赖跟踪文件包括 `server.js`、`db.js`、`routes/order.js`、`models/Order.js`、`package.json` 等。
- 当前没有发现主项目脚本或运行文档依赖它。
- 第二轮已从 tracking 移除其 `node_modules/`。

建议：`ARCHIVE`

理由：

- 它已明确废弃，但仍是完整旧后端源码。
- 删除旧后端不属于本次安全收口必要范围，应作为单独仓库清理 PR 处理。
- 若团队确认无审计/回滚价值，可后续单独 `DELETE_FROM_REPO`。

本轮处理：

- 只提交 `_deprecated_CNber_server_v1.0/node_modules/` 的 tracking 移除。
- 暂不提交旧后端源码删除。

### B. `PRICE_MATRIX_SEED.*`

检查结果：

- `PRICE_MATRIX_SEED.csv` 和 `PRICE_MATRIX_SEED.json` 是机场、邮编区域、服务类型、价格、司机分成、附加费等价格矩阵种子数据。
- 未发现真实客户、真实地址、订单号、手机号、token、账号密码。
- 数据看起来可能是正式业务价格配置，而非测试 fixture。
- 代码中已有 `PriceMatrix` 模型和 `/api/admin/price-matrix/import` 导入能力，但根目录 `PRICE_MATRIX_SEED.*` 没有明确脚本入口或 README 说明。

建议：`MOVE_TO_SEED_DIR`

理由：

- 可进入仓库，但不建议散落在根目录。
- 建议单独 PR 移动到 `CNber_backend/scripts/seeds/` 或 `docs/examples/price-matrix/`，并补说明用途和导入方式。
- 如果这是正式生产价格，应由业务方确认版本、有效期和审批来源。

本轮处理：

- 暂缓提交 `PRICE_MATRIX_SEED.csv`。
- 暂缓提交 `PRICE_MATRIX_SEED.json`。

### C. `order.js`

检查结果：

- 根目录 `order.js` 是未跟踪文件。
- 内容是一个 Express 订单路由文件，明显对应 `CNber_backend/routes/order.js` 的旧版或替代版本。
- 它包含订单创建、报价、支付、司机接单、开始、完成、拒单、取消等主流程路由。
- 与当前 `CNber_backend/routes/order.js` 相比，根目录 `order.js`：
  - 创建订单强制 `ORDER_STATUS.PENDING`，而当前后端路由强制 `ORDER_STATUS.CREATED`。
  - 接单逻辑允许司机抢 `pending` 池订单，当前路由只允许被指派司机确认 `assigned` 订单并转为 `driver_accepted`。
  - 未包含当前路由的定金/尾款提交接口。
  - 未包含当前路由的乘客取消接口。

影响判断：

- 客人下单：会影响初始订单状态。
- 报价：保留报价路由，但与当前支付阶段流程不完整。
- 派单：会影响派单后司机确认状态。
- 司机接单：会改变是否允许 pending 抢单。
- 订单完成：保留完成路由入口，但上下游状态可能不一致。
- 取消订单：缺少乘客取消入口，只保留司机取消入口。

建议：暂缓提交 / 单独 PR

理由：

- 它不是本次安全收口必要修改。
- 它涉及订单主流程，且可能回退当前预约制/支付阶段/后台派单逻辑。
- 不应进入本次任何提交组。

## 3. 最终提交计划

### Commit 1

Commit message:

```text
chore(security): remove tracked secrets and add env examples
```

包含文件：

- `.gitignore`
- `CNber_backend/.env`（tracking 删除）
- `CNber_sms_verification/.env`（tracking 删除）
- `CNber_admin_web/.env.development`（tracking 删除）
- `CNber_backend/.env.example`
- `CNber_sms_verification/.env.example`
- `CNber_admin_web_v1.0/.env.example`
- `CNber_admin_console_v1.0/.env.example`
- `CNber_client_admin_v1.0/.env.example`
- `CNber_driver_admin_v1.0/.env.example`
- `CNber_sms_verification/api/config/aliyun.js`
- `CNber_sms_verification/routes/sms.js`
- `CNber_sms_verification/utils/send-sms.js`
- `CNber_sms_verification/utils/sendSms.js`

精确 `git add`：

```bash
git add .gitignore \
  CNber_backend/.env.example \
  CNber_sms_verification/.env.example \
  CNber_admin_web_v1.0/.env.example \
  CNber_admin_console_v1.0/.env.example \
  CNber_client_admin_v1.0/.env.example \
  CNber_driver_admin_v1.0/.env.example \
  CNber_sms_verification/api/config/aliyun.js \
  CNber_sms_verification/routes/sms.js \
  CNber_sms_verification/utils/send-sms.js \
  CNber_sms_verification/utils/sendSms.js
git add -u -- CNber_backend/.env CNber_sms_verification/.env CNber_admin_web/.env.development
```

### Commit 2

Commit message:

```text
fix(config): require JWT secret and centralize API base URLs
```

包含文件：

- `CNber_backend/server.js`
- `CNber_backend/controllers/authController.js`
- `CNber_backend/middlewares/authMiddleware.js`
- `CNber_backend/middleware/auth.js`
- `CNber_admin_web_v1.0/src/api/request.js`
- `CNber_admin_web_v1.0/vite.config.js`
- `CNber_admin_web_v1.0/README.md`
- `CNber_admin_console_v1.0/config/api.js`
- `CNber_client_admin_v1.0/config/api.js`
- `CNber_driver_admin_v1.0/config/api.js`

精确 `git add`：

```bash
git add CNber_backend/server.js \
  CNber_backend/controllers/authController.js \
  CNber_backend/middlewares/authMiddleware.js \
  CNber_backend/middleware/auth.js \
  CNber_admin_web_v1.0/src/api/request.js \
  CNber_admin_web_v1.0/vite.config.js \
  CNber_admin_web_v1.0/README.md \
  CNber_admin_console_v1.0/config/api.js \
  CNber_client_admin_v1.0/config/api.js \
  CNber_driver_admin_v1.0/config/api.js
```

### Commit 3

Commit message:

```text
chore(deps): resolve production audit vulnerabilities
```

包含文件：

- `CNber_backend/package-lock.json`
- `CNber_sms_verification/package-lock.json`
- `CNber_admin_web_v1.0/package-lock.json`

精确 `git add`：

```bash
git add CNber_backend/package-lock.json \
  CNber_sms_verification/package-lock.json \
  CNber_admin_web_v1.0/package-lock.json
```

### Commit 4

Commit message:

```text
docs(release): add pre-production hardening reports
```

包含文件：

- `docs/PRE_PRODUCTION_HARDENING_REPORT.md`
- `docs/GIT_CLEANUP_AND_COMMIT_PLAN.md`
- `docs/PRE_COMMIT_GATE_REVIEW.md`
- `docs/admin-login.example.txt`

精确 `git add`：

```bash
git add docs/PRE_PRODUCTION_HARDENING_REPORT.md \
  docs/GIT_CLEANUP_AND_COMMIT_PLAN.md \
  docs/PRE_COMMIT_GATE_REVIEW.md \
  docs/admin-login.example.txt
```

### Commit 5

Commit message:

```text
chore(repo): remove tracked generated and dependency artifacts
```

包含文件：

- `_deprecated_CNber_server_v1.0/node_modules/`（tracking 删除）
- `CNber_admin_web/node_modules/`（tracking 删除）
- `CNber_backend/node_modules/`（tracking 删除）
- `CNber_sms_verification/node_modules/`（tracking 删除）
- `CNber_client_admin_v1.0/unpackage/`（tracking 删除）
- `CNber_driver_admin_v1.0/unpackage/`（tracking 删除）

精确 `git add`：

```bash
git add -u -- _deprecated_CNber_server_v1.0/node_modules \
  CNber_admin_web/node_modules \
  CNber_backend/node_modules \
  CNber_sms_verification/node_modules \
  CNber_client_admin_v1.0/unpackage \
  CNber_driver_admin_v1.0/unpackage
```

## 4. 可提交文件清单

可纳入本次安全收口：

- `.gitignore`
- `CNber_backend/.env.example`
- `CNber_sms_verification/.env.example`
- `CNber_admin_web_v1.0/.env.example`
- `CNber_admin_console_v1.0/.env.example`
- `CNber_client_admin_v1.0/.env.example`
- `CNber_driver_admin_v1.0/.env.example`
- `CNber_backend/server.js`
- `CNber_backend/controllers/authController.js`
- `CNber_backend/middlewares/authMiddleware.js`
- `CNber_backend/middleware/auth.js`
- `CNber_sms_verification/api/config/aliyun.js`
- `CNber_sms_verification/routes/sms.js`
- `CNber_sms_verification/utils/send-sms.js`
- `CNber_sms_verification/utils/sendSms.js`
- `CNber_admin_web_v1.0/src/api/request.js`
- `CNber_admin_web_v1.0/vite.config.js`
- `CNber_admin_web_v1.0/README.md`
- `CNber_admin_console_v1.0/config/api.js`
- `CNber_client_admin_v1.0/config/api.js`
- `CNber_driver_admin_v1.0/config/api.js`
- `CNber_backend/package-lock.json`
- `CNber_sms_verification/package-lock.json`
- `CNber_admin_web_v1.0/package-lock.json`
- `docs/PRE_PRODUCTION_HARDENING_REPORT.md`
- `docs/GIT_CLEANUP_AND_COMMIT_PLAN.md`
- `docs/PRE_COMMIT_GATE_REVIEW.md`
- `docs/admin-login.example.txt`
- 已 staged/可 staged 的 `.env`、`node_modules/`、`unpackage/` tracking 删除。

## 5. 暂缓文件清单

暂缓提交 / 单独 PR：

- `CNber_admin_web/` 除 `.env.development` 外的旧管理端删除。
- `_deprecated_CNber_server_v1.0/` 除 `node_modules/` 外的旧后端源码。
- `PRICE_MATRIX_SEED.csv`
- `PRICE_MATRIX_SEED.json`
- `order.js`
- `CNber_backend/routes/order.js`
- `CNber_backend/controllers/orderController.js`
- `CNber_backend/controllers/adminController.js`
- `CNber_backend/controllers/driverController.js`
- `CNber_backend/models/Order.js`
- `CNber_backend/models/PriceMatrix.js`
- `CNber_backend/models/User.js`
- `CNber_backend/routes/admin.js`
- `CNber_backend/routes/order.js`
- `CNber_backend/routes/payment.js`
- `CNber_admin_web_v1.0/src/api/admin.js`
- `CNber_admin_web_v1.0/src/layouts/MainLayout.vue`
- `CNber_admin_web_v1.0/src/router/index.js`
- `CNber_admin_web_v1.0/src/utils/orderStatus.js`
- `CNber_admin_web_v1.0/src/views/*`
- `CNber_client_admin_v1.0/pages*`
- `CNber_client_admin_v1.0/utils/order*`
- `CNber_driver_admin_v1.0/pages*`
- `CNber_driver_admin_v1.0/utils/orderStatus.js`
- `CNber_admin_console_v1.0/config/serviceTypes.js`
- `CNBER_V2_SCOPE_PERMISSION_DESIGN.md`

说明：以上包含业务主流程、价格体系或旧目录迁移内容，不属于本次安全收口的最小必要修改。

## 6. 不应提交文件清单

绝对不要提交：

- 本地 `.env`
- `.env.*`，但 `.env.example` 除外
- `node_modules/`
- `unpackage/`
- `dist/`
- `build/`
- `logs/`
- `*.log`
- `cnber客服后台登陆.txt`
- APK / wgt / HBuilderX 缓存 / Vite cache
- 未确认的旧目录删除
- 未确认的业务主流程文件

## 7. 需要人工确认的问题

1. `CNber_admin_web/` 是否正式废弃并由 `CNber_admin_web_v1.0` 完整替代。
2. `_deprecated_CNber_server_v1.0/` 是否仍需保留审计/回滚价值，或后续单独删除。
3. `PRICE_MATRIX_SEED.*` 是否为正式价格数据；若是，建议移动到 seed/example 目录并补导入说明。
4. 根目录 `order.js` 是否为误放文件、旧备份，还是待替换主路由；当前不应纳入安全收口。
5. 已有大量业务改动是否已经过主链路验收，是否需要另起 PR。

## 8. 结论

本轮建议只提交安全收口、配置收口、依赖锁文件、文档与 tracking 清理。旧目录删除、价格种子、根目录 `order.js` 和业务主流程改动全部暂缓，避免把上线前安全清理和业务行为变更混在一起。
