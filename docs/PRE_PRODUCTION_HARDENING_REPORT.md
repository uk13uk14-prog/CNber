# CNber 上线前安全与工程化收口报告

执行时间：2026-05-29

范围：

- `CNber_backend`
- `CNber_sms_verification`
- `CNber_admin_web_v1.0`
- `CNber_admin_console_v1.0`
- `CNber_client_admin_v1.0`
- `CNber_driver_admin_v1.0`

原则：不新增业务功能，不重构订单主链路，不删除业务源码。

## 1. 修改文件列表

### 本次应提交的源码修改

- `.gitignore`
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

### 本次应提交的配置模板 / 文档

- `CNber_backend/.env.example`
- `CNber_sms_verification/.env.example`
- `CNber_admin_web_v1.0/.env.example`
- `CNber_admin_console_v1.0/.env.example`
- `CNber_client_admin_v1.0/.env.example`
- `CNber_driver_admin_v1.0/.env.example`
- `docs/PRE_PRODUCTION_HARDENING_REPORT.md`

### 本次应提交的依赖锁文件

- `CNber_backend/package-lock.json`
- `CNber_sms_verification/package-lock.json`
- `CNber_admin_web_v1.0/package-lock.json`

说明：`npm audit fix` 修改了锁文件以修复 high/critical 漏洞。`node_modules/` 目录不应提交。

## 2. Secrets 处理结果

已完成：

- 根 `.gitignore` 已覆盖 `.env`、`.env.*`，并保留 `!.env.example`。
- 为 6 个目标子项目补充 `.env.example`，仅包含变量名和占位示例。
- 移除短信服务源码中的阿里云 AccessKey 明文。
- 移除短信发送成功时打印验证码明文的日志。
- 本地真实 `.env` 文件未被删除。

仍需执行的停止跟踪命令：

```bash
git rm --cached CNber_backend/.env
git rm --cached CNber_sms_verification/.env
git rm --cached CNber_admin_web/.env.development
```

备注：

- `git ls-files -- "*.env" "*.env.*" ":!:*.env.example"` 当前仍显示以上 3 个已跟踪 env 文件。
- 已发现旧文本文件 `cnber客服后台登陆.txt` 含局域网地址，未作为本次业务配置修改；是否保留需人工确认。
- 已泄露过的短信云密钥和 JWT 必须在服务商/部署环境中轮换，代码移除不等于密钥失效。

## 3. JWT_SECRET 修复结果

已完成：

- `CNber_backend/server.js` 在加载 `.env` 后立即检查 `JWT_SECRET`，缺失时直接抛错停止启动。
- `authController.js`、`middlewares/authMiddleware.js`、`middleware/auth.js` 不再使用 JWT 默认兜底字符串。
- 搜索结果未再发现 JWT 默认兜底写法。

行为变化：

- 本地启动后端前必须配置 `CNber_backend/.env` 中的 `JWT_SECRET`。
- 这是上线前安全收口，不改变登录/订单/派单业务流程。

## 4. 硬编码地址清理结果

已完成：

- Web 管理端统一使用 `VITE_API_BASE_URL`。
- Web 开发代理使用 `VITE_API_PROXY_TARGET`，默认 `http://127.0.0.1:3100`。
- 乘客端、司机端、运营控制台集中在各自 `config/api.js` 读取 `UNI_APP_API_BASE_URL` 或 `VITE_API_BASE_URL`。
- 移除业务配置中的旧局域网 IP 硬编码。
- 保留开发默认值 `http://127.0.0.1:3100/api`，避免破坏本地开发。

剩余说明：

- 文档和历史测试记录中仍有 `localhost` 示例，属于说明性内容。
- `cnber客服后台登陆.txt` 中仍包含旧局域网地址，建议人工确认是否删除、脱敏或移出仓库。

## 5. Audit 修复结果

执行过 `npm audit fix`，未使用 `--force`。

结果：

- `CNber_backend`: `npm audit --omit=dev --audit-level=high` 通过，0 vulnerabilities。
- `CNber_sms_verification`: `npm audit --omit=dev --audit-level=high` 通过，0 vulnerabilities。
- `CNber_admin_web_v1.0`: `npm audit --omit=dev --audit-level=high` 通过，0 vulnerabilities。

备注：

- Web 管理端 `npm audit fix` 曾提示 Vite/esbuild 的 moderate 开发服务器漏洞需要 `npm audit fix --force`，会升级到 breaking 版本；按要求未强制升级。
- 最终按 `--audit-level=high` 验证已通过。

## 6. Git 清理建议

### A. 应提交的源码修改

本次安全收口相关源码：

- 后端 JWT 配置与启动检查文件。
- 短信服务密钥环境变量化与日志脱敏文件。
- Web/uni-app API Base URL 配置文件。
- `.gitignore`。

### B. 应提交的配置模板 / docs

- 6 个 `.env.example`。
- `docs/PRE_PRODUCTION_HARDENING_REPORT.md`。

### C. 应忽略的构建产物

不要提交：

- `dist/`
- `build/`
- `unpackage/`
- `.vite/`
- `.cache/`
- `cache/`
- `coverage/`

当前 `npm run build` 会生成 `CNber_admin_web_v1.0/dist/`，应保持忽略。

### D. 应忽略的日志

不要提交：

- `logs/`
- `*.log`
- `CNber_backend/logs/`

### E. 应移出 Git 跟踪的 .env

执行：

```bash
git rm --cached CNber_backend/.env
git rm --cached CNber_sms_verification/.env
git rm --cached CNber_admin_web/.env.development
```

### F. 需要人工确认删除/保留的旧目录

- `CNber_admin_web/`：当前 Git 状态显示大量删除，需确认是否由 `CNber_admin_web_v1.0` 替代。
- `_deprecated_CNber_server_v1.0/`：标记为废弃，需确认是否继续留在主仓库。
- 日期快照目录如 `260428/`、`260429/`、`260504/`、`260509/`、`260521/`：不应混入上线提交。
- `order.js`、`PRICE_MATRIX_SEED.csv`、`PRICE_MATRIX_SEED.json`、`cnber客服后台登陆.txt`：需人工确认是否为正式交付文件。

### node_modules 特别说明

当前仓库存在已被 Git 跟踪的 `node_modules/` 文件，`npm audit fix` 会导致大量依赖目录变更。不要提交这些文件。

建议在确认后执行：

```bash
git rm -r --cached CNber_backend/node_modules
git rm -r --cached CNber_sms_verification/node_modules
git rm -r --cached CNber_admin_web_v1.0/node_modules
```

如对应目录未被跟踪，命令会失败或无变化，可忽略。

## 7. 验证命令与结果

后端：

```bash
cd CNber_backend
node --check server.js
npm audit --omit=dev --audit-level=high
```

结果：

- `node --check server.js`：通过。
- `npm audit --omit=dev --audit-level=high`：通过，0 vulnerabilities。

管理端：

```bash
cd CNber_admin_web_v1.0
npm run build
npm audit --omit=dev --audit-level=high
```

结果：

- `npm run build`：通过。
- `npm audit --omit=dev --audit-level=high`：通过，0 vulnerabilities。

短信服务：

```bash
cd CNber_sms_verification
npm audit --omit=dev --audit-level=high
```

结果：

- `npm audit --omit=dev --audit-level=high`：通过，0 vulnerabilities。

补充检查：

- IDE lint：本次修改范围未发现新增 linter 错误。
- 关键搜索：未再发现 JWT 默认兜底写法、源码级阿里云 AccessKey 明文、验证码明文日志、业务配置中的旧局域网 IP。

## 8. 剩余风险

- 已泄露过的真实密钥必须在外部平台轮换；代码层移除无法使旧密钥自动失效。
- `CNber_backend/.env`、`CNber_sms_verification/.env`、`CNber_admin_web/.env.development` 仍被 Git 跟踪，需要执行 `git rm --cached`。
- 仓库中已跟踪 `node_modules/`，需要单独移出跟踪，否则后续依赖安装/审计会持续污染 Git 状态。
- `cnber客服后台登陆.txt` 含局域网登录信息，建议人工确认是否保留并脱敏。
- 本次未改 CORS、注册限流、封禁账号登录拦截、SMS verify 持久化等非 P0 项。
- 本次未运行真实端到端下单/派单/行程完成流程，只做构建、语法和依赖验证。

## 9. 下一步建议

1. 先轮换所有已暴露密钥，并执行 `.env` / `node_modules` 的 `git rm --cached`。
2. 按 Git 清理建议拆分提交：安全配置、依赖锁、业务既有改动、旧目录迁移分开处理。
3. 增加最小 CI：`node --check`、`npm audit --omit=dev --audit-level=high`、`npm run build`。
4. 下一阶段处理 CORS 白名单、注册限流、封禁账号登录拦截、短信验证码完整校验闭环。
