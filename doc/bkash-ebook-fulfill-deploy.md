# Deploy: `POST /v3/bkash/bkash-ebook-fulfill-payment`

The Kabbik ebook API (`kabbik-ebook-backend`) confirms bKash payments by calling this route on the main gateway (`backend2025Latest`). If the route is missing from production or Apache does not proxy it to Node, clients see **502** on `POST /api/payments/confirm` with Nest logs showing **HTML `400 Bad Request`** (Apache), not JSON from Express.

## Code (this repo)

- **Route:** `src/routers/v3/bkash-router.js` → `POST /bkash-ebook-fulfill-payment` → `BkashController.bkashEbookFulfillPayment`
- **Handler:** `src/controllers/bkash-controller.js`, `src/data/models/bkash-model.js` (`bkashEbookFulfillPayment`)

Ensure the deployed commit includes the route (added in commit `5d3131d` or later).

## Production deploy (`api.kabbik.com`)

1. Deploy the latest `backend2025Latest` build to the same host/process that serves `POST …/bkash-onetime-create-payment-course-purchase`.
2. **Apache / reverse proxy:** Forward `POST /v3/bkash/bkash-ebook-fulfill-payment` (and the rest of `/v3/bkash/*`) to the Node app the same way as other bKash POST routes. A path-specific allowlist that omits this URL will return Apache HTML 400 before Express runs.
3. Restart Node after deploy.

## Smoke test (must hit Express)

```bash
./scripts/smoke-bkash-ebook-fulfill.sh
# or against production:
BASE_URL=https://api.kabbik.com/v3/bkash ./scripts/smoke-bkash-ebook-fulfill.sh
```

**Pass criteria:**

- Response headers include `X-Powered-By: Express`
- Body is JSON (e.g. `{ "data": { "success": false, "message": "Payment not found" } }`), not `<!DOCTYPE HTML … Bad Request`

**Fail pattern (current prod if undeployed):**

- `Server: Apache/…`, no `X-Powered-By: Express`, HTML 400 body

## Local dev with ebook API

Run this gateway locally (`node app.js`, port from `.env` / `constants.PORT`). In **kabbik-ebook-backend** set:

```env
BKASH_GATEWAY_URL=http://127.0.0.1:<PORT>/v3/bkash
```

Create and fulfill must use the same gateway DB (`bkashVoiceAcademy`, `purchase_type = ebook`).
