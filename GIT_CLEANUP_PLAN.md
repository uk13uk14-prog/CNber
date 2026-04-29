# CNber Git 状态体检与清理计划

> 扫描时间：2026-04-29  
> 扫描范围：当前 Git 工作区  
> 扫描原则：只读体检；未执行 `git add`、`git reset`、`git clean`、删除文件或业务代码修改。  
> 说明：以下数量基于生成本报告前的 `git status --porcelain=v1 -uall` 结果；本报告文件本身未计入统计。

## 1. 当前变更数量

| 类型 | 文件数 |
|------|--------|
| modified | 72 |
| deleted | 11931 |
| untracked | 633 |
| 合计 | 12636 |

按顶层目录观察：

| 顶层路径 | 主要状态 | 数量特征 |
|----------|----------|----------|
| `CNber_admin_web` | deleted | 11929 项，绝大多数为旧目录内 `node_modules` |
| `CNber_backend` | modified / untracked | modified 18，untracked 479 |
| `CNber_client_admin_v1.0` | modified / untracked | modified 35，untracked 9 |
| `CNber_driver_admin_v1.0` | modified / untracked | modified 17，untracked 61 |
| `CNber_admin_console_v1.0` | untracked | 52 |
| `CNber_admin_web_v1.0` | untracked | 25 |
| 根目录文档 / 临时文件 | modified / untracked / deleted | 少量 |

## 2. deleted 来源拆分

deleted 共 11931 项，互斥分类如下：

| 分类 | 数量 | 判断 |
|------|------|------|
| `node_modules` | 11896 | 可忽略，不应恢复进版本管理；后续应确认是否从 Git 追踪中移除 |
| 旧 `CNber_admin_web` 非 `node_modules` 文件 | 33 | 高风险，包含旧管理端源码与配置，需确认是否由新版替代 |
| 构建 / 缓存产物 | 1 | 可忽略，示例：`CNber_client_admin_v1.0/unpackage/dist/...` |
| 临时命名文件 | 1 | 可忽略，示例：`tree.txt` |
| 其他删除 | 0 | 暂无 |

旧 `CNber_admin_web` 非依赖删除样例包括：

- `CNber_admin_web/.env.development`
- `CNber_admin_web/App.vue`
- `CNber_admin_web/index.html`
- `CNber_admin_web/main.js`
- `CNber_admin_web/package.json`
- `CNber_admin_web/src/App.vue`
- `CNber_admin_web/src/router/index.js`
- `CNber_admin_web/src/store/auth.js`
- `CNber_admin_web/src/utils/request.js`
- `CNber_admin_web/src/views/Orders.vue`
- `CNber_admin_web/src/views/Drivers.vue`
- `CNber_admin_web/vite.config.js`

结论：`CNber_admin_web` 的删除不是单纯依赖清理，里面有旧管理端源码删除。若这是迁移到新版管理端的一部分，可以接受；否则属于发布前高风险项。

## 3. untracked 来源拆分

untracked 共 633 项，互斥分类如下：

| 分类 | 数量 | 判断 |
|------|------|------|
| `node_modules` | 462 | 可忽略，不应纳入版本管理 |
| 构建 / 缓存产物 | 57 | 可忽略，主要是 `unpackage/dist` 等运行产物 |
| 临时 / 日志命名文件 | 4 | 可忽略或需本地保留，示例：`logs/app.log`、`logs/error.log`、`123tree.txt`、`structure.txt` |
| 文档 / 文本 | 5 | 需确认是否纳入发布交付 |
| 源码 / 资源 / 配置 | 102 | 需确认，部分应纳入版本管理 |
| 其他 | 3 | 需确认 |

重点观察：

- `CNber_backend` untracked 479，其中包含后端源码文件，也包含 `node_modules` 与日志。需要分开处理，不能整体忽略或整体提交。
- `CNber_admin_console_v1.0` untracked 52，均表现为新版管理端源码、配置、资源和文档。
- `CNber_driver_admin_v1.0` untracked 61，其中既有 `D0003_driver_register.vue`、图标等源码资源，也有 `unpackage/dist` 构建产物。
- `CNber_client_admin_v1.0` untracked 9，其中有 `utils/addressApi.js`、`utils/orderApi.js`、`utils/orderFlow.js`、`utils/orderStatus.js`、`utils/request.js` 等源码文件，也有 `unpackage/dist` 产物。
- 根目录 `TEST_FLOW_CHECKLIST.md`、`TEST_EXECUTION_LOG.md`、`BUG_TRIAGE_GUIDE.md` 属于验收文档，建议保留但需确认是否随版本提交。

## 4. `CNber_admin_console_v1.0` 判断

结论：`CNber_admin_console_v1.0` 是新版管理端，建议纳入版本管理。

依据：

- `package.json` 标识为 `cnber-admin-console`，描述为“CNber 运营调度控制台（uni-app）”。
- `README_ADMIN_UI.md` 明确项目定位为面向客服 / 调度 / 运营的 uni-app 后台 UI。
- README 描述其核心闭环为“看单 → 详情 → 指派司机 → 跟进备注 → 状态维护”，与发布前管理端验收目标一致。
- `pages.json` 已包含登录、工作台、订单、司机、客户、设置、订单详情、指派司机、跟进备注等页面。
- 目录结构包含 `pages/`、`components/`、`services/`、`config/`、`utils/`、`store/`、`styles/`、`static/tab/`，不像临时构建产物。

纳入版本管理时建议包含：

- `App.vue`
- `main.js`
- `manifest.json`
- `pages.json`
- `package.json`
- `README_ADMIN_UI.md`
- `pages/`
- `components/`
- `services/`
- `config/`
- `utils/`
- `store/`
- `styles/`
- `static/tab/`

需注意：

- `static/tab/` 目前 README 标注为占位图标，但它们是页面运行所需资源，发布前可以先纳入，后续替换正式资源。
- 若后续产生 `unpackage/`、`node_modules/`、`.hbuilderx/`，不建议纳入版本管理。

## 5. 分类建议

### 可保留

- `CNber_admin_console_v1.0` 新版管理端源码、配置、资源、README。
- `TEST_FLOW_CHECKLIST.md`、`TEST_EXECUTION_LOG.md`、`BUG_TRIAGE_GUIDE.md`，作为发布前验收材料。
- 明确属于本轮业务修复的 `CNber_backend`、`CNber_client_admin_v1.0`、`CNber_driver_admin_v1.0` 源码变更，但需逐项复核后再提交。
- `CNber_admin_web_v1.0` 若确认为新的 Web 管理端版本，也可保留；但它与 `CNber_admin_console_v1.0` 的职责边界需确认。

### 可忽略

- 所有 `node_modules`，包括旧 `CNber_admin_web/node_modules` 删除与新 `CNber_backend/node_modules` 未跟踪。
- `unpackage/dist`、`.vite`、`cache`、构建输出、运行缓存。
- 后端日志：`CNber_backend/logs/app.log`、`CNber_backend/logs/error.log`。
- 临时结构文件：`tree.txt`、`123tree.txt`、`structure.txt`，除非它们被明确作为交付文档。
- 本地 IDE 配置：`.hbuilderx/launch.json`、`.vscode/settings.json`，除非团队约定共享。

### 需确认

- 旧 `CNber_admin_web` 是否正式废弃；如废弃，应通过一次明确的迁移/删除提交体现。
- `CNber_admin_web_v1.0` 与 `CNber_admin_console_v1.0` 是否同时保留，还是一个替代另一个。
- `CNber_backend` 中 untracked 的源码文件是否均为本轮后端实现，而非复制残留。
- `CNber_client_admin_v1.0/utils/*.js` 未跟踪文件是否已被页面引用，是否必须纳入发布。
- `CNber_driver_admin_v1.0/pages/D0003_driver_register.vue` 和 `static/icons/loading.gif` 是否属于正式功能资源。
- 根目录 `order.js` 来源不明，需确认是否为临时脚本、误放文件或正式工具。
- modified 中存在一个中文文件名显示为转义路径，需确认文件名是否正常以及是否应纳入版本。

### 高风险

- 旧 `CNber_admin_web` 删除包含 33 个非依赖文件，涉及源码、路由、视图、配置和 `.env.development`。发布前必须确认是否被 `CNber_admin_web_v1.0` 或 `CNber_admin_console_v1.0` 完整替代。
- 当前工作区同时存在大量 modified、deleted、untracked，若直接提交容易把依赖、构建产物、临时文件和真实业务变更混在一起。
- `CNber_backend` untracked 479 中混有源码、依赖和日志，不能按目录整体提交。
- `CNber_driver_admin_v1.0` untracked 61 中混有源码和 `unpackage/dist` 产物，不能按目录整体提交。
- `.env.development` 出现在被删除列表中，后续处理时需避免把敏感配置重新纳入提交。

## 6. 建议清理顺序（仅计划，未执行）

1. 先确认管理端版本策略：旧 `CNber_admin_web`、新 `CNber_admin_web_v1.0`、`CNber_admin_console_v1.0` 三者的保留关系。
2. 更新或新增 `.gitignore` 规则，覆盖 `node_modules/`、`unpackage/`、`dist/`、`.vite/`、`cache/`、日志文件和本地 IDE 配置。
3. 对 `CNber_backend`、乘客端、司机端逐目录复核源码变更，只保留发布相关文件。
4. 将验收文档作为独立一组变更处理。
5. 将新版管理端作为独立一组变更处理。
6. 在人工确认后，再进行后续 Git 操作；本轮体检不执行任何清理动作。

