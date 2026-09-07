# CNber Backend Dockerization Plan

> **Superseded for Phase-1 execution details by**  
> [`docs/CNBER_DOCKERIZATION_PLAN_V2.md`](./CNBER_DOCKERIZATION_PLAN_V2.md)  
> (M1-verified mongo volumes + `host.docker.internal` backend-only A/B).

Branch: `cursor/cnber-docker-backend-5a3c`  
Scope: audit + file prep + cutover/rollback plan. **No production cutover in this change.**

## 1. Audit summary (Git + declared M1 facts)

| Item | Finding |
|------|---------|
| Backend entry | `CNber_backend/server.js` → `npm start` / `node server.js` |
| Port | `PORT` env, default **3100** |
| Mongo | `MONGO_URL` \|\| `MONGO_URI` \|\| `mongodb://localhost:27017/cnber` |
| JWT | `JWT_SECRET` **required** at boot |
| Uploads static | `GET /uploads/*` → `public/uploads` |
| Payment proofs write | `public/uploads/payment-proofs/` (`utils/paymentProofUpload.js`) |
| Payment QR assets | `public/uploads/payment-accounts/` (seeded / managed URLs) |
| Admin SPA | `public/admin/` (build artifact, gitignored) |
| Logs write | `logs/app.log`, `logs/error.log` |
| APK `/downloads` | **Not in Git `main` `server.js`**. M1 runtime may have Version API + `/downloads/driver|client` (CASE_C). Compose still mounts `public/downloads` for recovery. |
| Absolute host paths in app code | Relative `__dirname` only (good for containers) |
| Secrets in image | Must stay in `.env.docker` / compose env — not Dockerfile |

### M1 live mongo-cnber

Cloud Agent **cannot** reach Tailscale `100.97.210.107` (ping/SSH/3100 timeout).  
Therefore live `docker inspect mongo-cnber` values are **UNKNOWN** until collected on M1.

User-declared facts (unverified from Cloud):

- Container name: `mongo-cnber`
- Docker Desktop on macOS running
- Backend path: `/Users/agent001/Desktop/CNber/CNber_backend`
- Backend historically PM2 / `node server.js` on 3100

## 2. Persistent paths (must survive recreate)

| Path (host, under backend) | Why | Mount style |
|----------------------------|-----|--------------|
| `public/uploads/` | payment-proofs + payment-accounts QR | **bind mount** (visible on M1 Desktop tree, easy backup) |
| `public/downloads/` | APK / version assets if present on M1 | **bind mount** |
| `public/admin/` | Admin SPA dist | **bind mount** (optional but practical) |
| `logs/` | winston files | **bind mount** |
| Mongo `/data/db` | production data | **named volume — reuse existing** (`external: true` after inspect) |

**Why bind mounts for uploads/downloads:** on M1 the project already lives under Desktop; operators expect files next to the repo; bind mounts avoid “volume only inside Docker Desktop VM” confusion during PM2↔Docker rollback.

## 3. Target architecture

```
[Client/Driver/Admin] --> host:3100 (after cutover) --> cnber-backend container
                                                      |
                                                      +--> mongo-cnber:27017 (Docker DNS)
```

- Backend env Mongo: `mongodb://mongo-cnber:27017/cnber` (DB name from current default/`cnber`)
- Do **not** point container backend at `localhost:27017` (that is the container itself, not Mongo)
- `PUBLIC_BASE_URL` remains an env entry; do not invent a public domain in this plan

## 4. Files added

| File | Purpose |
|------|---------|
| `CNber_backend/Dockerfile` | Node 20 LTS, `npm ci`, `CMD node server.js` |
| `CNber_backend/.dockerignore` | excludes node_modules, .env, logs, uploads |
| `CNber_backend/.env.docker.example` | compose env template |
| `docker-compose.yml` | backend + mongo (volume name must be confirmed) |
| `docker-compose.backend-only.yml` | safest first step: backend joins **existing** mongo network |
| `docs/DOCKERIZATION_PLAN.md` | this document |
| `scripts/m1-mongo-readonly-inspect.sh` | run on M1 only |

## 5. Cutover plan (DO NOT RUN YET)

1. **Backup Mongo** on M1: `docker exec mongo-cnber mongodump ...` to a dated folder outside the container.
2. **Record** `docker inspect mongo-cnber` (image, mounts, network, restart policy).
3. Set `cnber_mongo_data.external=true` / `CNBER_MONGO_NETWORK` from inspect (or use backend-only compose).
4. Copy `.env.docker.example` → `.env.docker`; set `JWT_SECRET` / `PUBLIC_BASE_URL` from current M1 `.env` (do not commit).
5. Ensure host dirs exist: `public/uploads`, `public/downloads`, `logs`, `public/admin`.
6. `docker compose -f docker-compose.backend-only.yml build`
7. Start backend on **13100**: `CNBER_HOST_PORT=13100 docker compose -f docker-compose.backend-only.yml up -d`
8. Validate against temp port:
   - `GET http://127.0.0.1:13100/api/status`
   - login / orders / dispatch / payment accounts / uploads URL / APK if present
9. Only after PASS: stop PM2/`node` on 3100 (**do not stop mongo-cnber**).
10. Recreate backend publish as `3100:3100`.
11. Full regression on 3100.
12. Remove PM2 process dependency last.

## 6. Rollback

If Docker backend fails:

```bash
docker stop cnber-backend || true
docker rm cnber-backend || true
# restore previous process (example)
cd /Users/agent001/Desktop/CNber/CNber_backend
# pm2 start server.js --name cnber-backend   OR
# node server.js
```

- **Mongo container stays running — never remove volume**
- uploads/downloads/logs bind mounts unchanged on host
- No data migration required for rollback

## 7. Blockers

1. M1 Tailscale not reachable from Cloud → cannot confirm mongo volume/network names.
2. Git `main` lacks `/downloads` + Version API (CASE_C); mount path prepared, runtime route may still be M1-only until recovery.
3. Existing `mongo-cnber` must be inspected before full compose that defines a mongo service (risk of empty volume if wrong name).

## 8. Execution readiness

See **V2**: `DOCKERIZATION_READY_FOR_EXECUTION=NO` (no compose/cutover until user re-approves).  
Phase-1 files: `BACKEND_ONLY_TEST_READY=YES` in `docs/CNBER_DOCKERIZATION_PLAN_V2.md`.

---

## CNBER_DOCKERIZATION_PLAN (v1 checklist — historical)

Superseded by V2. Kept for history:

```
BACKEND_DOCKER_READY=YES
CURRENT_MONGO_CONTAINER=mongo-cnber
CURRENT_MONGO_VOLUME=d2319608a2ae5f1502a725cca8274762efd3e02d3bee9363d8223528b722bcca
CURRENT_MONGO_NETWORK=bridge
BACKEND_DOCKERFILE=CNber_backend/Dockerfile
COMPOSE_FILE=docker-compose.backend-only.yml (phase1)
TEMP_TEST_PORT=13100
DATA_RISK=MEDIUM
DOCKERIZATION_READY_FOR_EXECUTION=NO
```

Full V2: `docs/CNBER_DOCKERIZATION_PLAN_V2.md`  
Full audit: `docs/CNBER_DOCKER_AUDIT_REPORT.md`
