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

## 5. Current mongo-cnber (M1 live — Cloud unverified)

| Field | Status |
|-------|--------|
| container name | `mongo-cnber` (user-declared) |
| image | **UNKNOWN** — run `scripts/m1-mongo-readonly-inspect.sh` on M1 |
| port | **UNKNOWN** (commonly `27017:27017`) |
| volume | **UNKNOWN** — must reuse existing; do not create empty replacement |
| network | **UNKNOWN** — required for `docker-compose.backend-only.yml` |
| restart policy | **UNKNOWN** |

Cloud Agent cannot reach M1 Tailscale (`100.97.210.107`); live inspect blocked.

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
