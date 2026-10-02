# Deploy: `GET /api/v4/home/quick-access`

## Code (this repo)

- **Route:** `src/routers/v4/home-router.js` → `GET /quick-access` → `QuickAccessController.getForUser`
- **Mount:** `/api/v4/home` in `app.js`
- **DB:** `migrations/20261002_create_quick_access_table.sql`

Ensure the deployed commit includes the route (added in `f9ee6ac` or later).

## Staging (`api-staging.kabbik.com` / `192.168.7.72`)

`git pull` under `/home/dvtech/backend2025Latest` is not enough if PM2 was first started from another directory. `pm2 restart primary-kabbik-backend` keeps the **old** `cwd` and old `app.js`.

After pull, from the repo root on the server:

```bash
cd /home/dvtech/backend2025Latest
bash scripts/pm2-reload-backend.sh
```

Or manually:

```bash
cd /home/dvtech/backend2025Latest
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
```

Apply DB migration on staging MySQL if `quick_access` does not exist.

## Smoke test

Without a token, the route must **not** return `Route not found` (expect `Unauthorized`):

```bash
BASE_URL=http://127.0.0.1:8080 ./scripts/smoke-quick-access.sh
BASE_URL=https://api-staging.kabbik.com ./scripts/smoke-quick-access.sh
```

With Bearer token, expect `{ "success": true, "message": "Quick access items retrieved", "data": [...] }`.

## Flutter

Use the same base URL and path prefix as other working staging v4 home APIs:

`GET https://api-staging.kabbik.com/api/v4/home/quick-access`

(Production may use `/v4/...` only if the prod gateway adds `/api`.)
