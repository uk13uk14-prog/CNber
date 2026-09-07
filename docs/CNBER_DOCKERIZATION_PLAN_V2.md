# CNber Backend Dockerization Plan V2
#
# Branch: `cursor/cnber-docker-backend-5a3c`
# Scope: update compose + plan from **M1-verified** Mongo facts.
# **No docker compose up / PM2 stop / mongo stop / cutover in this change.**

## M1 verified facts

| Field | Value |
|-------|-------|
| Container | `mongo-cnber` |
| Image | `mongo:7` |
| Status | Up |
| Restart | `unless-stopped` |
| Network | `bridge` |
| Container IP | `172.17.0.2` (**do not** hardcode as MONGO_URL) |
| Host port | `27017` → container `27017` |
| Data volume (`/data/db`) | `d2319608a2ae5f1502a725cca8274762efd3e02d3bee9363d8223528b722bcca` |
| Config volume (`/data/configdb`) | `f5e04826694f87ac4d5afd660b5282550221bf1b87a9b1550ccc67ba3fbe1fdb` |
| PM2 backend | host `:3100`, `/api/status` = 200 |

## Phase 1 principle

**Compose must NOT manage existing `mongo-cnber`.**

Forbidden in Phase 1:

- stop / recreate `mongo-cnber`
- attach a new Mongo volume / replace volumes
- modify Mongo data
- grab host `:3100`
- use `172.17.0.2` as connection string

Preferred path: **Backend-only A/B** via `docker-compose.backend-only.yml`.

## TEMP backend design

| Item | Value |
|------|-------|
| Service name | `cnber-backend-test` |
| Container port | `3100` |
| Host port | `13100` |
| Mongo URL | `mongodb://host.docker.internal:27017/cnber` |
| Secrets | `CNber_backend/.env.docker` (gitignored) |
| Bind mounts | `${CNBER_RUNTIME_ROOT}/public/{uploads,downloads,admin}` + `logs` |

Why `host.docker.internal`:

- M1 is macOS Docker Desktop
- `mongo-cnber` already publishes `27017` on the host
- Phase 1 does **not** require moving mongo onto a user-defined network

PM2 and Docker run **side by side**:

- baseline: `http://127.0.0.1:3100`
- candidate: `http://127.0.0.1:13100`

## Persistence

Set on M1 (example only — confirm locally):

```bash
export CNBER_RUNTIME_ROOT=/Users/agent001/Desktop/CNber/CNber_backend
```

Mounts:

- `${CNBER_RUNTIME_ROOT}/public/uploads` → payment proofs + payment-accounts QR files
- `${CNBER_RUNTIME_ROOT}/public/downloads` → APK / version assets if present
- `${CNBER_RUNTIME_ROOT}/public/admin` → admin SPA
- `${CNBER_RUNTIME_ROOT}/logs` → winston logs

If `downloads` lives elsewhere on M1, fix `CNBER_RUNTIME_ROOT` or the compose path **after inspect** — Cloud must not invent the path.

## A/B validation (read-mostly)

Compare **3100/PM2** vs **13100/Docker** for:

1. `GET /api/status`
2. Admin login
3. Client login
4. Driver login
5. `GET /api/payment/config` (or current payment accounts/config endpoint on runtime)
6. `GET /api/app/version?app=driver` (M1 CASE_C — may be absent on Git)
7. `GET /api/app/version?app=client`
8. Admin orders (read)
9. Driver orders (read)
10. payment QR asset URL/file
11. APK download path

### Data safety

Both backends share the same Mongo. Phase 1 allows:

- GET / read-only verification
- login / minimal session only

Forbidden without explicit user authorization:

- seed / migration / init-data / cleanup / reset
- create fake orders
- modify payment / driver / order status

## Cutover (NOT authorized yet)

Only after **13100 all PASS** and **user re-approves**:

1. Stop PM2 `cnber-backend`
2. Republish Docker backend as `3100:3100`
3. Verify `/api/status`
4. Client/Driver/Admin regression
5. Remove PM2 process for cnber-backend

**Do not execute cutover in this PR / this turn.**

## Phase 2 Mongo architecture (future only)

Optional later (explicit approval required):

1. Create user-defined network (e.g. `cnber_net`)
2. Connect existing `mongo-cnber` + `cnber-backend` to it **without recreating volumes**
3. Switch `MONGO_URL` to `mongodb://mongo-cnber:27017/cnber`

`docker-compose.yml` is gated with Compose `profiles: ["phase2-do-not-use"]` so a default `docker compose up` cannot manage mongo.

## Rollback (if temp Docker backend fails)

```bash
docker stop cnber-backend-test || true
docker rm cnber-backend-test || true
# PM2 on :3100 keeps running — no Mongo change
```

## Files

| File | Phase |
|------|-------|
| `docker-compose.backend-only.yml` | **Phase 1** (use this) |
| `docker-compose.yml` | Phase 2+ gated profile |
| `CNber_backend/Dockerfile` | image build |
| `CNber_backend/.env.docker.example` | template → copy to `.env.docker` |
| `docs/CNBER_DOCKERIZATION_PLAN_V2.md` | this doc |

---

## CNBER_DOCKERIZATION_PLAN_V2 checklist

```
CURRENT_MONGO_CONTAINER=mongo-cnber
CURRENT_MONGO_IMAGE=mongo:7
CURRENT_MONGO_NETWORK=bridge
CURRENT_MONGO_IP=172.17.0.2
CURRENT_MONGO_DATA_VOLUME=d2319608a2ae5f1502a725cca8274762efd3e02d3bee9363d8223528b722bcca
CURRENT_MONGO_CONFIG_VOLUME=f5e04826694f87ac4d5afd660b5282550221bf1b87a9b1550ccc67ba3fbe1fdb
MONGO_HOST_PORT=27017
TEMP_MONGO_URL=mongodb://host.docker.internal:27017/cnber
TEMP_BACKEND_PORT=13100
PM2_BASELINE_PORT=3100
BACKEND_ONLY_TEST_READY=YES
FULL_MONGO_COMPOSE_READY=NO
DATA_RISK=MEDIUM
BLOCKERS=Need M1 .env.docker from live secrets; CNBER_RUNTIME_ROOT must be set on M1; Version API may be M1-only; cutover not approved
DOCKERIZATION_READY_FOR_EXECUTION=NO
```

`BACKEND_ONLY_TEST_READY=YES` means files/plan are ready for a **user-approved** M1 A/B start.  
`DOCKERIZATION_READY_FOR_EXECUTION=NO` means Cloud/agent must **not** run compose/cutover until the user explicitly says so.
