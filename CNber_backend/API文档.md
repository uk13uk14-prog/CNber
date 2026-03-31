# CNber Backend API 文档

基础信息：

- Base URL: `http://localhost:3100/api`
- Content-Type: `application/json`
- 认证方式：JWT Bearer Token

通用请求头：

```http
Authorization: Bearer <token>
```

---

## 1. 服务状态

### GET `/status`

说明：
- 检查后端服务是否正常运行

请求参数：
- 无

请求头：
- 无

返回示例：

```json
{
  "ok": true,
  "message": "CNber backend is running"
}
```

---

## 2. 认证模块

### POST `/auth/register`

说明：
- 注册用户或司机账号

请求参数：

```json
{
  "phone": "447123456789",
  "password": "123456",
  "role": "user"
}
```

字段说明：
- `phone`: string，必填，手机号
- `password`: string，必填，密码
- `role`: string，可选，`user` 或 `driver`，默认 `user`

请求头：
- 无

成功返回示例：

```json
{
  "message": "注册成功",
  "token": "jwt-token-here",
  "user": {
    "_id": "67f000000000000000000001",
    "phone": "447123456789",
    "role": "user"
  }
}
```

失败返回示例：

```json
{
  "message": "该手机号已注册"
}
```

### POST `/auth/login`

说明：
- 用户或司机登录

请求参数：

```json
{
  "phone": "447123456789",
  "password": "123456"
}
```

字段说明：
- `phone`: string，必填
- `password`: string，必填

请求头：
- 无

成功返回示例：

```json
{
  "message": "登录成功",
  "token": "jwt-token-here",
  "user": {
    "_id": "67f000000000000000000001",
    "phone": "447123456789",
    "role": "user"
  }
}
```

失败返回示例：

```json
{
  "message": "密码错误"
}
```

---

## 3. 订单模块

### POST `/order/create`

说明：
- 创建订单
- `userId` 从 token 自动解析
- `status` 默认 `pending`

请求头：

```http
Authorization: Bearer <token>
```

请求参数：

```json
{
  "pickup": "London Heathrow Airport",
  "destination": "Cambridge City Centre"
}
```

字段说明：
- `pickup`: string，必填，起点
- `destination`: string，必填，终点

成功返回示例：

```json
{
  "message": "下单成功",
  "order": {
    "_id": "67f000000000000000000010",
    "userId": "67f000000000000000000001",
    "driverId": null,
    "status": "pending",
    "pickup": "London Heathrow Airport",
    "destination": "Cambridge City Centre",
    "createdAt": "2026-03-31T16:00:00.000Z"
  }
}
```

失败返回示例：

```json
{
  "message": "未提供 token"
}
```

### GET `/order/list`

说明：
- 获取订单列表
- `user` 角色：返回当前用户自己的订单
- `driver` 角色：返回
  - 所有 `pending`
  - 当前司机自己的 `accepted`
  - 当前司机自己的 `ongoing`

请求头：

```http
Authorization: Bearer <token>
```

请求参数：
- 无

成功返回示例：

```json
{
  "orders": [
    {
      "_id": "67f000000000000000000010",
      "userId": {
        "_id": "67f000000000000000000001",
        "phone": "447123456789"
      },
      "driverId": "67f000000000000000000002",
      "status": "accepted",
      "pickup": "London Heathrow Airport",
      "destination": "Cambridge City Centre",
      "createdAt": "2026-03-31T16:00:00.000Z"
    }
  ]
}
```

失败返回示例：

```json
{
  "message": "token 无效或已过期"
}
```

### POST `/order/accept`

说明：
- 司机接单
- 仅 `driver` 可操作
- 写入 `driverId`
- 状态改为 `accepted`

请求头：

```http
Authorization: Bearer <driver-token>
```

请求参数：

```json
{
  "orderId": "67f000000000000000000010"
}
```

成功返回示例：

```json
{
  "message": "接单成功",
  "order": {
    "_id": "67f000000000000000000010",
    "userId": "67f000000000000000000001",
    "driverId": "67f000000000000000000002",
    "status": "accepted",
    "pickup": "London Heathrow Airport",
    "destination": "Cambridge City Centre",
    "createdAt": "2026-03-31T16:00:00.000Z"
  }
}
```

失败返回示例：

```json
{
  "message": "只有司机可以接单"
}
```

### POST `/order/start`

说明：
- 司机开始行程
- 仅接单司机本人可操作
- 状态改为 `ongoing`

请求头：

```http
Authorization: Bearer <driver-token>
```

请求参数：

```json
{
  "orderId": "67f000000000000000000010"
}
```

成功返回示例：

```json
{
  "message": "行程已开始",
  "order": {
    "_id": "67f000000000000000000010",
    "userId": "67f000000000000000000001",
    "driverId": "67f000000000000000000002",
    "status": "ongoing",
    "pickup": "London Heathrow Airport",
    "destination": "Cambridge City Centre",
    "createdAt": "2026-03-31T16:00:00.000Z"
  }
}
```

失败返回示例：

```json
{
  "message": "订单不存在或无权限开始行程"
}
```

### POST `/order/complete`

说明：
- 司机完成订单
- 仅接单司机本人可操作
- 状态改为 `completed`

请求头：

```http
Authorization: Bearer <driver-token>
```

请求参数：

```json
{
  "orderId": "67f000000000000000000010"
}
```

成功返回示例：

```json
{
  "message": "行程已完成",
  "order": {
    "_id": "67f000000000000000000010",
    "userId": "67f000000000000000000001",
    "driverId": "67f000000000000000000002",
    "status": "completed",
    "pickup": "London Heathrow Airport",
    "destination": "Cambridge City Centre",
    "createdAt": "2026-03-31T16:00:00.000Z"
  }
}
```

失败返回示例：

```json
{
  "message": "订单不存在或无权限完成行程"
}
```

---

## 4. 用户模块

### GET `/user/list`

说明：
- 获取用户列表

请求参数：
- `page`: number，可选，默认 `1`
- `pageSize`: number，可选，默认 `10`
- `search`: string，可选，按手机号模糊查询

请求头：
- 无

请求示例：

```http
GET /api/user/list?page=1&pageSize=10&search=447
```

成功返回示例：

```json
{
  "users": [
    {
      "_id": "67f000000000000000000001",
      "phone": "447123456789",
      "role": "user"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### POST `/user/:id/ban`

说明：
- 封禁用户

请求参数：
- 路径参数 `id`: 用户 ID

请求头：
- 无

成功返回示例：

```json
{
  "success": true,
  "user": {
    "_id": "67f000000000000000000001",
    "phone": "447123456789",
    "role": "user",
    "status": "banned"
  }
}
```

### POST `/user/:id/unban`

说明：
- 解封用户

请求参数：
- 路径参数 `id`: 用户 ID

请求头：
- 无

成功返回示例：

```json
{
  "success": true,
  "user": {
    "_id": "67f000000000000000000001",
    "phone": "447123456789",
    "role": "user",
    "status": "active"
  }
}
```

---

## 5. 司机模块

### GET `/driver/list`

说明：
- 获取司机列表

请求参数：
- `page`: number，可选，默认 `1`
- `pageSize`: number，可选，默认 `10`
- `status`: string，可选，按司机状态筛选

请求头：
- 无

成功返回示例：

```json
{
  "drivers": [
    {
      "_id": "67f000000000000000000002",
      "userId": {
        "_id": "67f000000000000000000003",
        "phone": "447111111111"
      },
      "status": "approved"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### POST `/driver/:id/approve`

说明：
- 审核通过司机

请求参数：
- 路径参数 `id`: 司机 ID

请求头：
- 无

成功返回示例：

```json
{
  "success": true,
  "driver": {
    "_id": "67f000000000000000000002",
    "status": "approved"
  }
}
```

### POST `/driver/:id/reject`

说明：
- 驳回司机

请求参数：
- 路径参数 `id`: 司机 ID

请求头：
- 无

成功返回示例：

```json
{
  "success": true,
  "driver": {
    "_id": "67f000000000000000000002",
    "status": "rejected"
  }
}
```

### POST `/driver/:id/ban`

说明：
- 封禁司机

请求参数：
- 路径参数 `id`: 司机 ID

请求头：
- 无

成功返回示例：

```json
{
  "success": true,
  "driver": {
    "_id": "67f000000000000000000002",
    "status": "banned"
  }
}
```

---

## 常见错误返回

### 401 未授权

```json
{
  "message": "未提供 token"
}
```

或

```json
{
  "message": "token 无效或已过期"
}
```

### 403 无权限

```json
{
  "message": "无权限查看订单"
}
```

### 404 不存在

```json
{
  "message": "接口不存在"
}
```

### 500 服务异常

```json
{
  "message": "服务器内部错误"
}
```

