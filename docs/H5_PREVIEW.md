# CNber H5 Preview

分支：`cursor/cnber-h5-preview-5a3c`

## Preview URLs（Cloudflare Workers Temporary）

使用 `wrangler deploy --temporary` 部署到独立临时账号命名空间 `*.tricolor-trollius.workers.dev`。

**临时账号需在约 60 分钟内认领**，否则可能失效。认领后可转为稳定 Preview。

| App | Cloudflare name | URL |
|-----|-----------------|-----|
| Client | `cnber-client-preview` | https://cnber-client-preview.tricolor-trollius.workers.dev |
| Driver | `cnber-driver-preview` | https://cnber-driver-preview.tricolor-trollius.workers.dev |
| Admin | `cnber-admin-preview` | https://cnber-admin-preview.tricolor-trollius.workers.dev |
| Portal | `cnber-preview-portal` | https://cnber-preview-portal.tricolor-trollius.workers.dev |

认领链接见本轮报告中的 `CF_CLAIM_URL`。

说明：临时 Workers 可能对非浏览器流量返回 Cloudflare Managed Challenge（curl 见 403 / “Just a moment...”）。请用手机 Safari / Chrome 打开验收。

## Build commands

```bash
# Client H5
cd CNber_client_admin_v1.0
npm install
npm run build:h5
# output: dist/build/h5/

# Driver H5
cd CNber_driver_admin_v1.0
npm install
npm run build:h5
# output: dist/build/h5/

# Admin Web Preview（standalone base=/）
cd CNber_admin_web_v1.0
npm install
npm run build:preview
# output: dist/
# 注意：默认 npm run build 仍使用 base=/admin/，供后端托管。
```

## Deploy（Workers Static Assets）

```bash
npx wrangler deploy \
  --name cnber-client-preview \
  --compatibility-date 2026-09-03 \
  --assets=CNber_client_admin_v1.0/dist/build/h5
```

SPA：`[assets] not_found_handling = "single-page-application"`。

正式账号请配置 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`，并创建独立项目名（禁止复用其他业务 Workers）。

## API 状态

`API_PUBLIC_BLOCKED=YES`

H5 Preview **不**硬编码 `192.168.x.x` / `127.0.0.1` / `localhost`。

如需联调公网 API，构建时注入：

```bash
UNI_APP_API_BASE_URL=https://<cnber-public-api>/api npm run build:h5
# Admin:
VITE_API_BASE_URL=https://<cnber-public-api>/api npm run build:preview
```

无公网 API 时，登录页与主要 UI 仍可打开；接口调用会 toast 提示，不白屏。

## 重要声明

**H5 Preview ≠ Android Release**

H5 不代表以下能力已通过验收：

- 本地通知
- 震动
- 后台运行
- App Pay / APP-PLUS 原生能力（相册保存、plus.runtime 等）

APP-PLUS 实现通过 `#ifdef APP-PLUS` / 运行时 `typeof plus` 隔离，H5 改动不得删除原生路径。
