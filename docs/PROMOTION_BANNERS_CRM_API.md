# Promotion Banners API — CRM Integration Guide

This document describes how the **CRM backend** should integrate with the Kabbik **Promotion Banners** API for creating, updating, listing, toggling, and deleting promotional banners shown in the mobile/web app.

All promotion banner routes are under `/api/v4/promotionBanners`.

---

## Authentication

| Endpoint type | Auth required |
|---------------|---------------|
| `GET` (list, get one) | **No** — public |
| `POST`, `PATCH`, `DELETE` | **Yes** — admin JWT (`role = 2`) |

### Admin login

```http
POST /api/v1/auth/login-admin
Content-Type: application/json

{
  "user_name": "<admin_username>",
  "password": "<admin_password>"
}
```

**Response (200):**

```json
{
  "token": "<jwt>",
  "user": { ... }
}
```

### Using the token

Send on every write request:

```http
Authorization: Bearer <token>
```

---

## Response format

All endpoints return JSON in this shape:

**Success (with data):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Banner created"
}
```

**Success (delete — no data):**

```json
{
  "success": true,
  "message": "Banner deleted"
}
```

**Error:**

```json
{
  "success": false,
  "message": "Banner not found"
}
```

---

## Data model

### `promotion_banners` table

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | INT | auto | auto | Primary key |
| `banner_url` | TEXT | yes | — | Image URL |
| `goto_page` | VARCHAR(255) | yes | — | In-app route / deep link target |
| `is_active` | TINYINT(1) | no | `1` | `1` = active, `0` = inactive |
| `payload` | JSON | no | `null` | Extra metadata (campaign id, CTA, etc.) |
| `target_audience` | VARCHAR(255) | no | `all` on create | `all`, `free`, or `premium` |
| `created_at` | DATETIME | auto | NOW() | |
| `updated_at` | DATETIME | auto | NOW() | Auto-updates on change |
| `deleted_at` | DATETIME | no | `null` | Soft delete timestamp |

### `target_audience` values

| Value | Meaning |
|-------|---------|
| `all` | Show to all users (default on create) |
| `free` | Free-tier users only |
| `premium` | Premium/subscribed users only |

Invalid values return **400**:

```json
{
  "success": false,
  "message": "target_audience must be one of: all, free, premium"
}
```

### Banner object (API response)

```json
{
  "id": 1,
  "banner_url": "https://cdn.kabbik.com/banners/promo-summer.jpg",
  "goto_page": "/audiobooks/123",
  "is_active": 1,
  "payload": {
    "campaign_id": "summer-2026",
    "cta_label": "Listen now"
  },
  "target_audience": "premium",
  "created_at": "2026-09-21T10:00:00.000Z",
  "updated_at": "2026-09-21T10:00:00.000Z",
  "deleted_at": null
}
```

---

## API endpoints

### 1. List banners

```http
GET /api/v4/promotionBanners
```

**Auth:** None

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `is_active` | `0` \| `1` \| `true` \| `false` | No | Filter by active status |

**Example:**

```http
GET /api/v4/promotionBanners?is_active=1
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "banner_url": "https://cdn.kabbik.com/banners/promo.jpg",
      "goto_page": "/home",
      "is_active": 1,
      "payload": null,
      "target_audience": "all",
      "created_at": "2026-09-21T10:00:00.000Z",
      "updated_at": "2026-09-21T10:00:00.000Z",
      "deleted_at": null
    }
  ],
  "message": "Banners retrieved"
}
```

**CRM usage:** Admin list page — fetch all banners, optionally filter active only. Filter by `target_audience` on the **CRM/client side** after fetch (no server-side `target_audience` query param).

---

### 2. Get banner by ID

```http
GET /api/v4/promotionBanners/:id
```

**Auth:** None

**Example:**

```http
GET /api/v4/promotionBanners/1
```

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Banner retrieved"
}
```

**Response (404):**

```json
{
  "success": false,
  "message": "Banner not found"
}
```

---

### 3. Create banner

```http
POST /api/v4/promotionBanners
Authorization: Bearer <admin_jwt>
Content-Type: application/json
```

**Auth:** Admin required

**Request body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `banner_url` | string | **yes** | — | Banner image URL |
| `goto_page` | string | **yes** | — | Navigation target |
| `is_active` | `0` \| `1` | no | `1` | Active flag |
| `payload` | object | no | `null` | JSON metadata |
| `target_audience` | string | no | `all` | `all`, `free`, or `premium` |

**Example:**

```json
{
  "banner_url": "https://cdn.kabbik.com/banners/promo-new.jpg",
  "goto_page": "/audiobooks/456",
  "is_active": 1,
  "target_audience": "premium",
  "payload": {
    "campaign_id": "summer-2026",
    "cta_label": "Start listening"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Banner created"
}
```

**Response (400):**

```json
{
  "success": false,
  "message": "banner_url and goto_page are required"
}
```

---

### 4. Update banner (partial)

```http
PATCH /api/v4/promotionBanners/:id
Authorization: Bearer <admin_jwt>
Content-Type: application/json
```

**Auth:** Admin required

Send **only fields to change**. Allowed fields:

- `banner_url`
- `goto_page`
- `is_active`
- `payload`
- `target_audience`

**Example:**

```json
{
  "goto_page": "/home",
  "target_audience": "free",
  "payload": {
    "campaign_id": "updated-campaign"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Banner updated"
}
```

**Response (400):**

```json
{
  "success": false,
  "message": "No fields to update"
}
```

**Response (404):**

```json
{
  "success": false,
  "message": "Banner not found"
}
```

---

### 5. Toggle active status

```http
PATCH /api/v4/promotionBanners/:id/toggle
Authorization: Bearer <admin_jwt>
```

**Auth:** Admin required

**Body:** None

Flips `is_active` (`1` → `0` or `0` → `1`).

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Banner toggled"
}
```

**Response (404):**

```json
{
  "success": false,
  "message": "Banner not found"
}
```

---

### 6. Delete banner (soft delete)

```http
DELETE /api/v4/promotionBanners/:id
Authorization: Bearer <admin_jwt>
```

**Auth:** Admin required

Sets `deleted_at = NOW()`. Row is not returned in list/get after delete.

**Response (200):**

```json
{
  "success": true,
  "message": "Banner deleted"
}
```

**Response (404):**

```json
{
  "success": false,
  "message": "Banner not found or already deleted"
}
```

---

## Endpoint summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v4/promotionBanners` | Public | List banners (`?is_active=` optional) |
| `GET` | `/api/v4/promotionBanners/:id` | Public | Get one banner |
| `POST` | `/api/v4/promotionBanners` | Admin | Create banner |
| `PATCH` | `/api/v4/promotionBanners/:id` | Admin | Partial update |
| `PATCH` | `/api/v4/promotionBanners/:id/toggle` | Admin | Toggle `is_active` |
| `DELETE` | `/api/v4/promotionBanners/:id` | Admin | Soft delete |

---

## CRM implementation checklist

### 1. Auth layer

- [ ] Call `POST /api/v1/auth/login-admin` on CRM admin login (or reuse existing admin session token).
- [ ] Store JWT securely; attach `Authorization: Bearer <token>` on all write calls.
- [ ] Handle **401** — refresh login or redirect to CRM login.

### 2. List / table view

- [ ] `GET /api/v4/promotionBanners` (optionally `?is_active=1` for active-only).
- [ ] Display columns: id, banner_url (thumbnail), goto_page, target_audience, is_active, created_at.
- [ ] Client-side filter by `target_audience` if CRM UI needs audience tabs.

### 3. Create form

- [ ] Required: `banner_url`, `goto_page`.
- [ ] Optional: `is_active` (default on), `target_audience` dropdown (`all` / `free` / `premium`), `payload` JSON editor.
- [ ] `POST /api/v4/promotionBanners` on submit.

### 4. Edit form

- [ ] `GET /api/v4/promotionBanners/:id` to load.
- [ ] `PATCH /api/v4/promotionBanners/:id` on save (send changed fields only).

### 5. Quick actions

- [ ] Toggle button → `PATCH /api/v4/promotionBanners/:id/toggle`.
- [ ] Delete button → `DELETE /api/v4/promotionBanners/:id` (confirm dialog).

### 6. Error handling

| HTTP | Typical `message` | CRM action |
|------|-------------------|------------|
| 400 | Validation errors | Show field error |
| 401 | Unauthorized | Re-login admin |
| 404 | Not found | Refresh list / redirect |
| 500 | Server error | Show generic error, retry |

---

## Example: Node.js / axios (CRM service)

```javascript
const axios = require('axios');

const API_BASE = process.env.KABBIK_API_URL;
let adminToken = null;

async function loginAdmin(username, password) {
  const { data } = await axios.post(`${API_BASE}/api/v1/auth/login-admin`, {
    user_name: username,
    password,
  });
  adminToken = data.token;
  return adminToken;
}

function authHeaders() {
  return { Authorization: `Bearer ${adminToken}` };
}

async function listBanners({ isActive } = {}) {
  const params = isActive !== undefined ? { is_active: isActive ? 1 : 0 } : {};
  const { data } = await axios.get(`${API_BASE}/api/v4/promotionBanners`, { params });
  return data.data;
}

async function createBanner(body) {
  const { data } = await axios.post(
    `${API_BASE}/api/v4/promotionBanners`,
    body,
    { headers: authHeaders() }
  );
  return data.data;
}

async function updateBanner(id, body) {
  const { data } = await axios.patch(
    `${API_BASE}/api/v4/promotionBanners/${id}`,
    body,
    { headers: authHeaders() }
  );
  return data.data;
}

async function toggleBanner(id) {
  const { data } = await axios.patch(
    `${API_BASE}/api/v4/promotionBanners/${id}/toggle`,
    {},
    { headers: authHeaders() }
  );
  return data.data;
}

async function deleteBanner(id) {
  await axios.delete(`${API_BASE}/api/v4/promotionBanners/${id}`, {
    headers: authHeaders(),
  });
}
```

---

## Example: cURL

```bash
# List (public)
curl -s "$KABBIK_API_URL/api/v4/promotionBanners?is_active=1"

# Admin login
TOKEN=$(curl -s -X POST "$KABBIK_API_URL/api/v1/auth/login-admin" \
  -H "Content-Type: application/json" \
  -d '{"user_name":"admin","password":"secret"}' | jq -r .token)

# Create
curl -s -X POST "$KABBIK_API_URL/api/v4/promotionBanners" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "banner_url": "https://cdn.kabbik.com/banners/promo.jpg",
    "goto_page": "/home",
    "target_audience": "all",
    "payload": {"campaign_id": "crm-001"}
  }'

# Toggle
curl -s -X PATCH "$KABBIK_API_URL/api/v4/promotionBanners/1/toggle" \
  -H "Authorization: Bearer $TOKEN"

# Delete
curl -s -X DELETE "$KABBIK_API_URL/api/v4/promotionBanners/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Swagger (local dev)

When `ENV=dev`, interactive docs:

```
http://localhost:8080/api-docs
```

- Server: **v4 — Local dev**
- Tag: **PromotionBanners**
- Authorize: **adminBearerAuth** (paste token from `login-admin`)

---

## Database setup (backend ops)

Run migrations on the Kabbik API database:

```bash
mysql -u <user> -p <database> < migrations/20260921_create_promotion_banners.sql
```

If table exists without `payload` / `target_audience`:

```bash
mysql -u <user> -p <database> < migrations/20260921_add_payload_to_promotion_banners.sql
mysql -u <user> -p <database> < migrations/20260921_add_target_audience_to_promotion_banners.sql
```

---

## Related backend files (Kabbik API repo)

| File | Purpose |
|------|---------|
| `src/routers/v4/banners-router.js` | Route definitions |
| `src/controllers/banner-controller.js` | Request validation & responses |
| `src/data/models/banner-model.js` | SQL queries |
| `src/swagger/banner-swagger-schemas.js` | OpenAPI schemas |
| `migrations/20260921_create_promotion_banners.sql` | Table DDL |

---

## Notes for app clients

- Mobile/web app should call `GET /api/v4/promotionBanners?is_active=1` and filter banners by `target_audience` based on the user's subscription tier (`all` always shown; match `free` or `premium` as needed).
- `goto_page` is app-specific routing — coordinate format with mobile team (e.g. `/audiobooks/123`, `/home`).
- `payload` is flexible JSON for analytics, campaign tracking, or UI extras without schema changes.
