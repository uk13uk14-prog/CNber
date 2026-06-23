# CNber P0 试运营部署流程（RC1）

本文档描述 **CNber_backend + 管理 Web + uni-app 三端** 的最小部署步骤。不包含业务功能说明，仅覆盖环境与发布检查。

---

## 1. 环境变量说明

在 `CNber_backend/.env` 中配置（可复制 `.env.example` 后修改）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `JWT_SECRET` | **是** | 强随机字符串；未设置时服务拒绝启动 |
| `MONGO_URL` 或 `MONGO_URI` | **是** | MongoDB 连接串，例如 `mongodb://127.0.0.1:27017/cnber` |
| `PORT` | 否 | 默认 `3100` |
| `PUBLIC_BASE_URL` | **试运营建议必填** | 对外可访问的根 URL，**勿用 127.0.0.1**。付款凭证上传返回 `${PUBLIC_BASE_URL}/uploads/...`。例：`http://192.168.1.187:3100` |
| `CORS_ORIGINS` | 生产建议填 | 逗号分隔的前端来源白名单。例：`https://app.cnber.com,https://admin.cnber.com`。`NODE_ENV=production` 时生效；开发环境允许全部来源 |
| `NODE_ENV` | 生产设为 `production` | 启用 CORS 白名单 |
| `IDEAL_POSTCODES_API_KEY` | 地址联想时需要 | 英国邮编 lookup |

**uni-app 乘客 / 司机端**（HBuilder 或 `.env`）：

| 变量 | 说明 |
|------|------|
| `UNI_APP_API_BASE_URL` | API 根路径，默认 `http://127.0.0.1:3100/api`。真机须改为服务器局域网或公网 IP，例：`http://192.168.1.187:3100/api` |

**管理 Web 开发**（`CNber_admin_web_v1.0/.env`）：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 开发代理用，生产构建后由后端 `/api` 相对路径托管 |

---

## 2. Admin Build 与同步

```bash
cd CNber_admin_web_v1.0
npm install
npm run build
```

将构建产物复制到后端静态目录（Windows PowerShell 示例）：

```powershell
Remove-Item -Recurse -Force ..\CNber_backend\public\admin\* -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force dist\* ..\CNber_backend\public\admin\
```

Linux / macOS：

```bash
rm -rf ../CNber_backend/public/admin/*
cp -r dist/* ../CNber_backend/public/admin/
```

验证：`CNber_backend/public/admin/index.html` 存在，且引用的 `/admin/assets/*.js` 与 `dist` 一致。

---

## 3. 后端启动

```bash
cd CNber_backend
npm install
npm start
```

### PM2 启动（推荐生产 / 长期试运营）

```bash
cd CNber_backend
npm install --production

# 首次
pm2 start server.js --name cnber-backend

# 更新代码后
pm2 restart cnber-backend

# 查看日志
pm2 logs cnber-backend

# 开机自启（可选）
pm2 save
pm2 startup
```

环境变量可通过 `pm2 start server.js --name cnber-backend --update-env` 配合 ecosystem 文件，或在使用前 `export` / 写入 `.env`（`dotenv` 已加载）。

---

## 4. 部署后检查命令

将 `<HOST>` 替换为实际 IP 或域名（含端口，如 `192.168.1.187:3100`）。

```bash
# 1) 后端存活
curl -s http://<HOST>/api/status
# 期望：{"code":0,...,"data":{"ok":true,...}}

# 2) 管理后台 SPA
curl -s -o /dev/null -w "%{http_code}" http://<HOST>/admin/
# 期望：200

# 3) P0 业务闭环 smoke（在服务器上、Mongo 可连时执行）
cd CNber_backend
npm run smoke:p0
# 期望最后一行：>>> PASS，退出码 0
```

**真机补充检查（手工）：**

1. 乘客端配置 `UNI_APP_API_BASE_URL=http://<HOST>/api` 后能登录、下单。
2. 上传付款截图后，管理端「支付审核」可打开图片 URL（须已配置 `PUBLIC_BASE_URL=http://<HOST>`）。

---

## 5. 回滚方式

### 代码回滚（git tag）

```bash
git fetch --tags
git checkout p0-trial-rc1   # 或上一个稳定 tag / commit
cd CNber_admin_web_v1.0 && npm run build
# 重新复制 dist 到 CNber_backend/public/admin
cd ../CNber_backend
pm2 restart cnber-backend   # 或 npm start
npm run smoke:p0
```

### PM2 快速回滚

若仍保留上一版进程目录，可 checkout 旧 commit 后：

```bash
pm2 restart cnber-backend
```

### 数据库

P0 smoke 与试运营数据在 MongoDB `cnber` 库。回滚代码**不自动回滚数据**；必要时从备份恢复或手工清理测试订单。

### 静态资源

- 管理 Web：恢复 `public/admin/` 为上一版 `dist` 备份。
- 用户上传：`public/uploads/` 已在 `.gitignore`，部署时保留该目录，勿随 git 回滚删除。

---

## 6. 最小部署顺序（清单）

1. 配置 `CNber_backend/.env`（`JWT_SECRET`、`MONGO_URL`、`PUBLIC_BASE_URL`、`CORS_ORIGINS`）
2. `CNber_admin_web_v1.0` → `npm run build` → 复制到 `CNber_backend/public/admin`
3. `CNber_backend` → `npm start` 或 `pm2 start`
4. `curl` 检查 `/api/status` 与 `/admin`
5. `npm run smoke:p0`
6. uni-app 配置 `UNI_APP_API_BASE_URL` → 真机走通一单

---

## 相关文档

- `docs/P0_TRIAL_OPS_LOOP.md` — P0 运营链路与 API
- `docs/P0_TRIAL_FLOW_SMOKE_TEST.md` — smoke 脚本说明
