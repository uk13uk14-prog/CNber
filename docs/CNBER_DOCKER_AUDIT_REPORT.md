# CNBER_DOCKER_AUDIT_REPORT

Scope: Git checkout audit + declared M1 facts. **No runtime changes. No cutover.**

Generated on branch `cursor/cnber-docker-backend-5a3c`.

## 1. Backend package.json

| Field | Value |
|-------|-------|
| name | `cnber-backend` |
| main | `server.js` |
| start | `node server.js` |
| key deps | express, mongoose, dotenv, jsonwebtoken, winston, morgan, cors, bcryptjs |
| PM2 | **not** a package dependency (historical host process only) |

## 2. server.js

| Item | Finding |
|------|---------|
| Entry | `node server.js` |
| Port | `process.env.PORT \|\| 3100` |
| JWT | `JWT_SECRET` required at boot |
| Mongo | `MONGO_URL \|\| MONGO_URI \|\| mongodb://localhost:27017/cnber` |
| Health | `GET /api/status` |
| Static | `/uploads` → `public/uploads`; `/admin` → `public/admin` |
| Absolute host paths | **No** — relative `__dirname` only |

## 3. .env / .env.example

| File | Role |
|------|------|
| `.env.example` | Host/dev defaults use `127.0.0.1` Mongo (OK for local non-Docker) |
| `.env.docker.example` | Compose template: `mongodb://mongo-cnber:27017/cnber` |
| `.env` / `.env.docker` | **Must not** be committed; secrets via env_file only |

## 4. MongoDB connection string

- Default DB name: **`cnber`**
- Container target (compose): `mongodb://mongo-cnber:27017/cnber`
- Host localhost Mongo is **forbidden** inside backend container (points at itself)

## 5. Current mongo-cnber (M1 verified)

| Field | Value |
|-------|--------|
| container name | `mongo-cnber` |
| image | `mongo:7` |
| port | `0.0.0.0:27017` → `27017/tcp` |
| data volume `/data/db` | `d2319608a2ae5f1502a725cca8274762efd3e02d3bee9363d8223528b722bcca` |
| config volume `/data/configdb` | `f5e04826694f87ac4d5afd660b5282550221bf1b87a9b1550ccc67ba3fbe1fdb` |
| network | `bridge` |
| container IP | `172.17.0.2` (unstable — do not hardcode) |
| restart policy | `unless-stopped` |

Phase 1 TEMP Mongo URL: `mongodb://host.docker.internal:27017/cnber`  
See `docs/CNBER_DOCKERIZATION_PLAN_V2.md`.

## 6. Backend filesystem dependencies

| Path / concern | Needed in container? | Persist? |
|----------------|----------------------|----------|
| Local absolute paths | No (relative only) | n/a |
| `public/uploads` | Yes (static + writes) | **YES — bind mount** |
| `public/uploads/payment-proofs` | Runtime writes | **YES** |
| `public/uploads/payment-accounts` | QR image files (seed URLs) | **YES** |
| `public/downloads` (+ driver/client) | M1 CASE_C / Version API may exist | **YES — bind mount** |
| `public/admin` | Admin SPA | bind mount recommended |
| `logs/` | winston `app.log` / `error.log` | **YES — bind mount** |
| `scripts/` | ops/smoke only, not PID 1 | in image OK |
| `static/logo.png` | asset in repo | bake into image OK |

## 7. APK download actual path

- Git `main` `server.js`: **no** `/downloads` route / Version API
- Declared M1 runtime may serve APK under `public/downloads/driver` and `public/downloads/client` (CASE_C)
- Compose mounts `./CNber_backend/public/downloads` for recovery

## 8. Payment QR upload actual path

- DB fields: `qrCodeUrl` / `qrImage` (URL strings)
- Seed historical host path pattern: `/uploads/payment-accounts/{wechat,alipay}-qr.jpg`
- Files on disk: `public/uploads/payment-accounts/` (under uploads bind mount)

## 9. Backend write locations

| Writer | Path |
|--------|------|
| `utils/paymentProofUpload.js` | `public/uploads/payment-proofs/*` |
| `utils/logger.js` | `logs/app.log`, `logs/error.log` |

## 10. Persistence required?

**YES.** Must persist Mongo volume + uploads + downloads + logs. Prefer:

- Mongo: **reuse existing named volume** (`external: true` after inspect)
- uploads/downloads/admin/logs: **bind mounts** (Desktop tree visibility + easy PM2 rollback)

---

See also: `docs/DOCKERIZATION_PLAN.md`
