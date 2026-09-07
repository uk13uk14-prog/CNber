# CNber H5 Mobile Preview

分支：`cursor/cnber-h5-mobile-preview-5a3c`

## Preview URLs（Cloudflare Temporary Workers）

| App | URL |
|-----|-----|
| Client | https://cnber-client-preview.fossil-organization.workers.dev/ |
| Driver | https://cnber-driver-preview.fossil-organization.workers.dev/ |
| Admin | https://cnber-admin-preview.fossil-organization.workers.dev/ |
| Portal | https://cnber-preview-portal.fossil-organization.workers.dev/ |

Claim（约 60 分钟）：https://dash.cloudflare.com/claim-preview?claimToken=0-vLkbvjtNk34TVmvMvWfRHciZrlRlR-XkW9UzO77X8

说明：临时 Workers 常对自动化流量返回 Cloudflare Managed Challenge（403 / Just a moment）。请用手机浏览器打开；认领后更稳定。

## API

`PUBLIC_API_READY=NO`

三端统一变量：`VITE_CNBER_API_BASE_URL`（禁止局域网/localhost）。

## Build

```bash
cd CNber_client_admin_v1.0 && npm install && npm run build:h5
cd CNber_driver_admin_v1.0 && npm install && npm run build:h5
cd CNber_admin_web_v1.0 && npm install && npm run build:preview
```

## APP-PLUS 边界

H5 可验证：UI、登录、下单、订单、派单、接单、状态同步（需公网 API）。

H5 不代表：真机提示音、震动、本地通知、后台常驻、自动拉起微信/支付宝。
