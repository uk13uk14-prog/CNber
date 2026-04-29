# CNber_admin_console_v1.0 — 运营调度控制台

## 项目定位

面向 **客服 / 调度 / 运营** 的 **uni-app（Vue3）** 后台 UI：偏 **App 卡片式**，可在 **HBuilderX 运行到浏览器（H5）**，也便于手机/平板预览。  
与现有 **CNber_backend** 对接，核心闭环：**看单 → 详情 → 指派司机 → 跟进备注 → 状态维护**。

## 目录结构（分层）

| 目录 | 职责 |
|------|------|
| `pages/` | 页面路由与编排，不写裸 `uni.request` |
| `components/` | 卡片、摘要、状态徽章、跟进项等可复用块 |
| `services/` | 订单 / 司机 / 客户 / 统计 / 登录 API 封装 |
| `config/` | API 约定、订单 UI 状态映射、服务类型、菜单 |
| `utils/` | `request`、时间/金额/脱敏、导航 |
| `store/` | 轻量会话（Storage 读写） |
| `styles/` | SCSS 设计令牌 |
| `static/tab/` | TabBar 占位图标（可替换为正式资源） |

## 页面结构（与 `pages.json` 一致）

| 路径 | 说明 |
|------|------|
| `B0001_admin_login` | 登录（需 `User.role === admin`） |
| `B0300_admin_dashboard` | 工作台 + 统计卡片 + 快捷入口（Tab） |
| `B0101_admin_order_list` | 订单列表（筛选 + 卡片）（Tab） |
| `B0102_admin_order_detail` | 订单详情 + 底部操作 |
| `B0103_admin_dispatch` | 分发 / 指派司机 |
| `B0104_admin_followup` | 跟进与备注 |
| `B0201_admin_driver_list` | 司机列表（Tab） |
| `B0202_admin_customer_list` | 客户列表（Tab） |
| `B0203_admin_driver_detail` | 司机详情占位 |
| `B0204_admin_customer_detail` | 客户详情占位 |
| `B0501_admin_settings` | API 地址、环境、清缓存、版本（Tab） |

底部 Tab：**工作台 / 订单 / 司机 / 客户 / 设置**。

## 当前接口对接情况

### 已对接（真实）

| 能力 | 方法 | 路径 |
|------|------|------|
| 登录 | POST | `/api/auth/login` |
| 订单列表 | GET | `/api/order/list`（admin 全量 + 查询参数） |
| 订单详情 | GET | `/api/admin/orders/:id` |
| 指派司机 | POST | `/api/admin/orders/:id/assign` |
| 跟进备注 | POST | `/api/admin/orders/:id/notes` |
| 修改主状态 | POST | `/api/admin/orders/:id/status` |
| 工作台统计 | GET | `/api/admin/stats` |
| 司机列表 | GET | `/api/admin/drivers` |
| 客户列表 | GET | `/api/user/list?role=user` |
| 健康检查 | GET | `/api/status`（设置页「测试连接」，免登录） |

### 尚未对接 / 占位（UI 已预留）

| 说明 |
|------|
| 客户详情页「历史订单」需后端按 `userId` 过滤列表或专用聚合接口（见页面 TODO） |
| 司机详情页扩展资料、行程、收入等 |

## 运行方式

1. 启动 **MongoDB**，启动 **CNber_backend**（默认 `http://localhost:3100`）。  
2. **创建 admin 账号**（任选其一）：  
   - 在项目根执行：  
     `node CNber_backend/scripts/createConsoleAdmin.js 你的手机号 你的密码`  
   - 或在 Mongo 中将某用户的 `role` 改为 `admin` 并设置 `password` 为 bcrypt 哈希（与现网一致即可）。  
3. 用 **HBuilderX** 打开目录 **`CNber_admin_console_v1.0`** → 运行 → **运行到浏览器**。  
4. H5 默认端口见 `manifest.json` → `h5.devServer.port`（**8090**，避免与常见 8080 冲突）。  
5. 真机调试时，在 **设置** 页将 API Base 改为 `http://<电脑局域网IP>:3100/api`。

## 订单 UI 状态

统一在 `config/orderStatus.js`：将后端 `status` + `paymentStatus` + `driverId` 映射为  
`pending | paid | waiting_driver | assigned | accepted | in_progress | completed | cancelled` 的展示键及颜色文案。

## 配色（与设计一致）

背景 `#f7f8fa`、主色 `#1677ff`、成功 `#12b76a`、警告 `#f79009`、危险 `#f04438`、主文 `#1a1a1a`、次文 `#667085`、边 `#e5e7eb`。
