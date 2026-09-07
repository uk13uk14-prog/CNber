# CNber H5 Mobile Preview

分支：`cursor/cnber-h5-mobile-preview-5a3c`

## 目标

手机 Safari / Chrome 打开 Client / Driver / Admin，联调同一 CNber API（公网就绪后）。

## 统一 API

```bash
# 三端优先读取（禁止局域网 / localhost）
VITE_CNBER_API_BASE_URL=https://api.<cnber-domain>/api
```

当前：`PUBLIC_API_READY=NO`（仍可打开 UI；接口调用会友好提示）。

## Build

```bash
cd CNber_client_admin_v1.0 && npm install && npm run build:h5
cd CNber_driver_admin_v1.0 && npm install && npm run build:h5
cd CNber_admin_web_v1.0 && npm install && npm run build:preview
```

## Deploy

```bash
# temporary Workers（CNber 独立项目名）
bash scripts/deploy-h5-preview.sh --temporary
```

Worker names：`cnber-client-preview` / `cnber-driver-preview` / `cnber-admin-preview` / `cnber-preview-portal`

## APP-PLUS 边界

H5 可验证：UI、登录、下单、订单、派单、接单、状态同步、支付配置读取。

H5 不代表：真机提示音、震动、本地通知、后台常驻、自动拉起微信/支付宝。

原生能力统一 toast：`此功能请在 CNber App 中使用`
