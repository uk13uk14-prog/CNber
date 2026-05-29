# CNber Git 清理与可提交分组计划

执行时间：2026-05-29

目标：只清理仓库状态，不新增功能，不改业务逻辑，不执行 `git commit` / `git push`。

## 1. 初始检查命令

已按要求执行：

```bash
git status --short
git diff --stat
```

结果摘要：

- 工作区已有大量历史变更，包含旧 `CNber_admin_web/` 删除、新业务源码修改、依赖修复锁文件、已跟踪 `node_modules/`、已跟踪 `unpackage/`、敏感 `.env` 跟踪项。
- `git diff --stat` 在清理后显示 87 个非依赖/非构建源码与配置文件变更，另有大量已移出跟踪的依赖和构建产物删除记录。

## 2. 已执行的 `git rm --cached` 命令

### Secrets / env

```bash
git rm --cached "CNber_backend/.env" "CNber_sms_verification/.env" "CNber_admin_web/.env.development"
```

结果：

- 已从 Git 跟踪中移除。
- 本地真实 `.env` 文件未被主动删除。
- 复查 `git ls-files -- "*.env" "*.env.*" ":!:*.env.example"`：无输出。

### node_modules

检查命令：

```powershell
git ls-files | Where-Object { $_ -match 'node_modules/' }
```

发现并处理的目录：

```bash
git rm -r --cached "_deprecated_CNber_server_v1.0/node_modules" "CNber_admin_web/node_modules" "CNber_backend/node_modules" "CNber_sms_verification/node_modules"
git rm -r --cached --sparse "CNber_admin_web/node_modules" "CNber_backend/node_modules"
```

说明：

- 第一次命令因 sparse-checkout 对 `CNber_admin_web/node_modules` 有提示，随后用 `--sparse` 补处理。
- 复查已跟踪 `node_modules/` 数量：0。
- 本地 `node_modules` 未被主动删除。

### 构建产物 / 运行产物

检查命令：

```powershell
git ls-files | Where-Object { $_ -notmatch 'node_modules/' -and $_ -match '(^|/)(dist|build|unpackage|logs)/|\.log$' }
```

发现并处理的目录：

```bash
git rm -r --cached "CNber_client_admin_v1.0/unpackage" "CNber_driver_admin_v1.0/unpackage"
git rm -r --cached --sparse "CNber_client_admin_v1.0/unpackage" "CNber_driver_admin_v1.0/unpackage"
```

说明：

- 第二次 `--sparse` 用于补清剩余跟踪条目。
- 复查已跟踪 `dist/build/unpackage/logs/*.log` 数量：0。
- 本地构建产物未被主动删除。

## 3. `cnber客服后台登陆.txt` 处理

检查结果：

- 包含真实账号密码。
- 包含局域网 IP。
- 包含后台登录地址。
- 未发现 token。

处理方式：

- 原文件当前未被 Git 跟踪。
- 已在 `.gitignore` 增加 `cnber客服后台登陆.txt`，避免误提交。
- 已新增脱敏模板：`docs/admin-login.example.txt`。

模板内容：

```text
后台地址：
账号：
密码：
备注：
```

## 4. 建议提交顺序

### Group 1：安全配置收口

建议包含：

- `.gitignore`
- `CNber_backend/.env.example`
- `CNber_backend/server.js`
- `CNber_backend/controllers/authController.js`
- `CNber_backend/middlewares/authMiddleware.js`
- `CNber_backend/middleware/auth.js`
- `CNber_sms_verification/.env.example`
- `CNber_sms_verification/api/config/aliyun.js`
- `CNber_sms_verification/routes/sms.js`
- `CNber_sms_verification/utils/send-sms.js`
- `CNber_sms_verification/utils/sendSms.js`

目的：

- 移除真实 secrets 风险。
- 禁止 JWT 默认密钥。
- 短信密钥全部改为环境变量。
- 避免验证码明文进入日志。

### Group 2：API 地址配置收口

建议包含：

- `CNber_admin_web_v1.0/.env.example`
- `CNber_admin_web_v1.0/src/api/request.js`
- `CNber_admin_web_v1.0/vite.config.js`
- `CNber_admin_web_v1.0/README.md`
- `CNber_admin_console_v1.0/.env.example`
- `CNber_admin_console_v1.0/config/api.js`
- `CNber_client_admin_v1.0/.env.example`
- `CNber_client_admin_v1.0/config/api.js`
- `CNber_driver_admin_v1.0/.env.example`
- `CNber_driver_admin_v1.0/config/api.js`

目的：

- Web 管理端使用 `VITE_API_BASE_URL` / `VITE_API_PROXY_TARGET`。
- uni-app 端使用 `UNI_APP_API_BASE_URL` 或 `VITE_API_BASE_URL`。
- 保留开发默认值，移除业务配置中的个人局域网 IP。

### Group 3：依赖修复

建议包含：

- `CNber_backend/package-lock.json`
- `CNber_sms_verification/package-lock.json`
- `CNber_admin_web_v1.0/package-lock.json`

说明：

- 当前 `package.json` 未发生版本字段变化。
- 依赖修复由 `npm audit fix` 更新 lockfile 完成。

### Group 4：文档

建议包含：

- `docs/PRE_PRODUCTION_HARDENING_REPORT.md`
- `docs/GIT_CLEANUP_AND_COMMIT_PLAN.md`
- `docs/admin-login.example.txt`

目的：

- 留存上线前安全收口记录。
- 留存 Git 清理与提交计划。
- 用脱敏模板替代本地敏感登录笔记。

### Group 5：移出 Git 跟踪

建议作为独立提交，包含索引删除：

- `CNber_backend/.env`
- `CNber_sms_verification/.env`
- `CNber_admin_web/.env.development`
- `_deprecated_CNber_server_v1.0/node_modules/`
- `CNber_admin_web/node_modules/`
- `CNber_backend/node_modules/`
- `CNber_sms_verification/node_modules/`
- `CNber_client_admin_v1.0/unpackage/`
- `CNber_driver_admin_v1.0/unpackage/`

目的：

- 清出 secrets、依赖目录、构建产物、运行产物。
- 后续由 `.gitignore` 防止再次进入 Git。

## 5. 仍需人工确认的文件 / 目录

以下不建议混入本轮安全收口提交，需人工确认业务意图：

- `CNber_admin_web/`：当前有大量非依赖文件删除，需确认是否正式被 `CNber_admin_web_v1.0` 替代。
- `_deprecated_CNber_server_v1.0/`：废弃服务目录仍保留源码，需确认是否继续留在主仓库。
- `CNber_admin_console_v1.0/config/serviceTypes.js`：既有修改，不属于本轮 Git 清理。
- `CNber_admin_web_v1.0/src/api/admin.js`、多个 views、后端 controller/model/routes、乘客端/司机端页面等：既有业务改动，不属于本轮 Git 清理。
- `CNBER_V2_SCOPE_PERMISSION_DESIGN.md`：既有新增文档，是否纳入提交需确认。
- `PRICE_MATRIX_SEED.csv`、`PRICE_MATRIX_SEED.json`：需确认是否正式种子数据。
- `order.js`：来源不明，需确认是否临时文件。
- `cnber客服后台登陆.txt`：本地敏感文件，已加入 `.gitignore`，不应提交。

## 6. 验证结果

### CNber_backend

命令：

```bash
cd CNber_backend
node --check server.js
npm audit --omit=dev --audit-level=high
```

结果：

- `node --check server.js`：通过。
- `npm audit --omit=dev --audit-level=high`：通过，`found 0 vulnerabilities`。

### CNber_admin_web_v1.0

命令：

```bash
cd CNber_admin_web_v1.0
npm run build
npm audit --omit=dev --audit-level=high
```

结果：

- `npm run build`：通过，Vite 构建成功。
- `npm audit --omit=dev --audit-level=high`：通过，`found 0 vulnerabilities`。

### CNber_sms_verification

命令：

```bash
cd CNber_sms_verification
npm audit --omit=dev --audit-level=high
```

结果：

- `npm audit --omit=dev --audit-level=high`：通过，`found 0 vulnerabilities`。

## 7. 绝对不要提交的文件

不要提交：

- `.env`
- `.env.*`，但 `.env.example` 除外。
- `node_modules/`
- `dist/`
- `build/`
- `unpackage/`
- `logs/`
- `*.log`
- `.DS_Store`
- `.vscode/`
- `.idea/`
- `cnber客服后台登陆.txt`
- APK、wgt、HBuilderX 缓存、Vite cache。

## 8. 当前清理结论

- 已跟踪 secrets：0。
- 已跟踪 `node_modules/`：0。
- 已跟踪 `dist/build/unpackage/logs/*.log`：0。
- 已生成脱敏后台登录模板。
- 已完成后端、Web 管理端、短信服务验证。
- 未执行 `git commit`。
- 未执行 `git push`。
