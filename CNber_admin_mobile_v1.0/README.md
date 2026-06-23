# CNber Admin Lite Mobile V1

后台运营轻量移动端（uni-app / HBuilderX），复用 `CNber_backend` 现有 Admin API。

## HBuilderX 运行

1. 启动后端：`cd CNber_backend && npm start`（默认 `http://127.0.0.1:3100`）
2. HBuilderX → 文件 → 导入 → 选择本目录 `CNber_admin_mobile_v1.0`
3. 运行到浏览器：运行 → 运行到浏览器 → Chrome（H5 默认 `http://localhost:8081`）
4. 运行到真机 App：修改 `config/api.js` 中 `DEFAULT_APP_PLUS_API_BASE_URL` 为电脑局域网 IP
5. 可选：项目根目录 `.env` 设置 `UNI_APP_API_BASE_URL=http://192.168.x.x:3100/api`

## 测试账号

先执行 `node CNber_backend/scripts/createTestAccounts.js` 创建基础账号。

| 角色 | 登录标识（phone 字段） | 密码 | 说明 |
|------|------------------------|------|------|
| admin | `13800000000` | `Admin123456` | 全部功能 |
| operator | 需在 Web 员工管理创建 | — | 与 admin 类似，受权限矩阵约束 |
| dispatcher | 需在 Web 员工管理创建 | — | 调度中心 / 订单 |
| support | `smoke_support_perm@cnber.local` | `Smoke123456` | 权限 smoke 脚本创建 |
| finance | `smoke_finance_perm@cnber.local` | `Smoke123456` | 权限 smoke 脚本创建 |

> 登录接口字段名为 `phone`，可填手机号或邮箱形式标识（如 `admin@cnber.local`），均存入 User.phone。
