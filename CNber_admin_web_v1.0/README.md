# CNber_admin_web_v1.0

Vue3 + Vite 的 PC 端管理后台 MVP：订单、调度指派、司机分层关系。

## 运行

1. 启动 MongoDB 与 `CNber_backend`（默认 `http://localhost:3100`）。
2. 确保存在 `role=admin` 的账号（可用 `CNber_backend/scripts/createConsoleAdmin.js`）。
3. 在本目录执行：

```bash
npm install
npm run dev
```

4. 浏览器打开终端提示的地址（一般为 `http://localhost:5173`）。  
   API 通过开发代理访问 `/api` → 后端 `3100`。

生产构建可将 `VITE_API_BASE_URL` 设为完整后端地址，并自行配置 nginx 反代。

## 验收闭环

登录 → 订单列表 → 订单详情 → 分配司机（三节司机）→ 指派 → 返回详情查看司机与状态。
