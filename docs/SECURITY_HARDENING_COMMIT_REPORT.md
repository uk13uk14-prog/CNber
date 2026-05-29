# CNber 安全收口提交报告

执行时间：2026-05-29

说明：已按 `docs/PRE_COMMIT_GATE_REVIEW.md` 的 5 组计划执行提交。未执行 `git push`。

## 1. 提交记录

### Commit 1

- Hash: `26012bd`
- Message: `chore(security): remove tracked secrets and add env examples`
- 主要文件：
  - `.gitignore`
  - `CNber_backend/.env`（从 Git tracking 移除）
  - `CNber_sms_verification/.env`（从 Git tracking 移除）
  - `CNber_admin_web/.env.development`（从 Git tracking 移除）
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

### Commit 2

- Hash: `dae58de`
- Message: `fix(config): require JWT secret and centralize API base URLs`
- 文件：
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

### Commit 3

- Hash: `753ee1c`
- Message: `chore(deps): resolve production audit vulnerabilities`
- 文件：
  - `CNber_backend/package-lock.json`
  - `CNber_sms_verification/package-lock.json`
  - `CNber_admin_web_v1.0/package-lock.json`

### Commit 4

- Hash: `2f335a6`
- Message: `docs(release): add pre-production hardening reports`
- 文件：
  - `docs/PRE_PRODUCTION_HARDENING_REPORT.md`
  - `docs/GIT_CLEANUP_AND_COMMIT_PLAN.md`
  - `docs/PRE_COMMIT_GATE_REVIEW.md`
  - `docs/admin-login.example.txt`

### Commit 5

- Hash: `3f9f447`
- Message: `chore(repo): remove tracked generated and dependency artifacts`
- 文件范围：
  - `_deprecated_CNber_server_v1.0/node_modules/`（从 Git tracking 移除）
  - `CNber_admin_web/node_modules/`（从 Git tracking 移除）
  - `CNber_backend/node_modules/`（从 Git tracking 移除）
  - `CNber_sms_verification/node_modules/`（从 Git tracking 移除）
  - `CNber_client_admin_v1.0/unpackage/`（从 Git tracking 移除）
  - `CNber_driver_admin_v1.0/unpackage/`（从 Git tracking 移除）

## 2. 最终验证结果

### CNber_backend

命令：

```bash
cd CNber_backend
node --check server.js
npm audit --omit=dev --audit-level=high
```

结果：

- `node --check server.js`: 通过。
- `npm audit --omit=dev --audit-level=high`: 通过，`found 0 vulnerabilities`。

### CNber_admin_web_v1.0

命令：

```bash
cd CNber_admin_web_v1.0
npm run build
npm audit --omit=dev --audit-level=high
```

结果：

- `npm run build`: 通过，Vite 构建成功。
- `npm audit --omit=dev --audit-level=high`: 通过，`found 0 vulnerabilities`。

### CNber_sms_verification

命令：

```bash
cd CNber_sms_verification
npm audit --omit=dev --audit-level=high
```

结果：

- `npm audit --omit=dev --audit-level=high`: 通过，`found 0 vulnerabilities`。

## 3. 最终 `git log --oneline -5`

```text
3f9f447 chore(repo): remove tracked generated and dependency artifacts
2f335a6 docs(release): add pre-production hardening reports
753ee1c chore(deps): resolve production audit vulnerabilities
dae58de fix(config): require JWT secret and centralize API base URLs
26012bd chore(security): remove tracked secrets and add env examples
```

## 4. 仍未提交 / 暂缓项

以下内容按闸门审查要求未纳入 5 个安全收口提交：

- `order.js`
- `PRICE_MATRIX_SEED.csv`
- `PRICE_MATRIX_SEED.json`
- `CNber_admin_web/` 旧目录源码删除
- `_deprecated_CNber_server_v1.0/` 旧后端源码
- `CNber_admin_console_v1.0/config/serviceTypes.js`
- `CNBER_V2_SCOPE_PERMISSION_DESIGN.md`
- `CNber_admin_web_v1.0/src/api/admin.js`
- `CNber_admin_web_v1.0/src/layouts/MainLayout.vue`
- `CNber_admin_web_v1.0/src/router/index.js`
- `CNber_admin_web_v1.0/src/utils/orderStatus.js`
- `CNber_admin_web_v1.0/src/views/*`
- `CNber_backend/controllers/adminController.js`
- `CNber_backend/controllers/driverController.js`
- `CNber_backend/controllers/orderController.js`
- `CNber_backend/models/Order.js`
- `CNber_backend/models/PriceMatrix.js`
- `CNber_backend/models/User.js`
- `CNber_backend/routes/admin.js`
- `CNber_backend/routes/order.js`
- `CNber_backend/routes/payment.js`
- `CNber_client_admin_v1.0/pages*`
- `CNber_client_admin_v1.0/utils/order*`
- `CNber_driver_admin_v1.0/pages*`
- `CNber_driver_admin_v1.0/utils/orderStatus.js`

这些文件涉及业务主流程、价格体系、旧目录迁移或待确认功能，不应混入安全收口提交。

## 5. 最终工作区状态摘要

提交后仍有未提交改动，主要为暂缓项：

- 旧 `CNber_admin_web/` 非依赖源码删除仍未提交。
- 多个后端、Web、乘客端、司机端业务文件仍有未提交修改。
- `PRICE_MATRIX_SEED.*` 和 `order.js` 仍为未跟踪文件。
- 本报告 `docs/SECURITY_HARDENING_COMMIT_REPORT.md` 是提交后生成的报告，当前未提交。

## 6. 后续建议

1. 不要直接 `git add .`，后续仍需按 PR/提交主题精确暂存。
2. 单独确认旧 `CNber_admin_web/` 是否归档或删除。
3. 单独确认 `_deprecated_CNber_server_v1.0/` 是否保留审计价值。
4. 将 `PRICE_MATRIX_SEED.*` 移动到 seed/example 目录后单独提交，并补导入说明。
5. 对 `order.js` 和 `CNber_backend/routes/order.js` 做主流程专项审查后再决定是否提交。
6. 推送前再次执行后端审计、Web 构建和审计。
