# Rent Catalog API — Business Logic & Implementation

Read-only discovery endpoints for rent-eligible audiobooks. Mounted at **`/api/v4/rent`**. No auth required. Does not create rentals or process payments — purchase flows live in payment gateway modules (bKash, Nagad, GP, etc.).

---

## Table of contents

1. [Overview](#overview)
2. [Domain concepts](#domain-concepts)
3. [Eligibility rules](#eligibility-rules)
4. [API endpoints](#api-endpoints)
5. [Response contract](#response-contract)
6. [Pagination & filter handling](#pagination--filter-handling)
7. [Caching (trending only)](#caching-trending-only)
8. [Search](#search)
9. [Architecture & file map](#architecture--file-map)
10. [Database dependencies](#database-dependencies)
11. [Database indexing](#database-indexing)
12. [Swagger](#swagger)
13. [Operational notes](#operational-notes)
14. [Out of scope](#out-of-scope)

---

## Overview

The Rent module exposes four GET endpoints for clients (mobile/web) to browse and search the rent catalog:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v4/rent/trending` | Audiobooks ranked by paid rental volume in a time window |
| `GET /api/v4/rent/new-releases` | Recently added rent titles within a time window |
| `GET /api/v4/rent/all` | Full rent catalog with optional category/channel filters |
| `GET /api/v4/rent/search` | FULLTEXT search on name and author fields |

All endpoints return the same envelope shape with paginated `data` and `meta`. List endpoints are offset-based (`page` + `limit`), not cursor-based.

**Mount point** (`app.js`):

```js
app.use(constants.API + constants.VERSION_4 + '/rent', rentRouter);
// → /api/v4/rent/*
```

---

## Domain concepts

### Rent-eligible audiobook

An audiobook row in `audiobooks` that is offered for rent. Eligibility is enforced consistently across all four endpoints (see [Eligibility rules](#eligibility-rules)).

### Rental transaction (`audiobooks_rent`)

Records a user's rental of an audiobook. Rows are created by payment flows when a user completes a rent purchase (`payment_id`, `expired_at`, `is_purchased`, etc.).

**Trending** uses this table as the signal source: it counts how many **paid** rentals (`payment_id IS NOT NULL`) occurred per audiobook in the lookback window. Unpaid or incomplete rows do not contribute to trending rank.

### Catalog card fields

Every list/search query returns a shared field set (`CARD_FIELDS` in the model):

`id`, `name`, `en_name`, `author_name`, `en_author_name`, `description`, `thumb_path`, `banner_path`, `price`, `discount_price`, `price_in_usd`, `publish_year`, `rent_duration_in_month`, `rent_duration_in_day`, `total_duration`, `category_id`, `channel_id`, `premium`, `play_count`, `created_at`

Additional fields per endpoint:

- **Trending:** `rent_count` — number of paid rentals in the window
- **Search:** `relevance` — MySQL FULLTEXT score

---

## Eligibility rules

Every query applies the same base filter on `audiobooks`:

```
for_rent = 1
AND deleted = 0
AND approval_status = 1
```

| Flag | Meaning |
|------|---------|
| `for_rent = 1` | Title is marked rentable in admin/catalog |
| `deleted = 0` | Not soft-deleted |
| `approval_status = 1` | Approved for public display |

Trending additionally requires the audiobook to appear in `audiobooks_rent` with a non-null `payment_id` inside the `months` window.

---

## API endpoints

### `GET /api/v4/rent/trending`

**Business logic:** Surface titles users are actively renting. Rank by paid rental count (desc), tie-break by `audiobook_id` desc.

**Query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `months` | `4` | Lookback window for counting rentals |
| `page` | `1` | 1-based page |
| `limit` | `20` | Page size (clamped 1–100) |

**SQL strategy:**

1. Subquery on `audiobooks_rent`: group by `audiobook_id`, count rows where `payment_id IS NOT NULL` and `created_at >= NOW() - INTERVAL ? MONTH`, restricted to eligible audiobooks.
2. Order by `rent_count DESC`, paginate in subquery.
3. Join back to `audiobooks` for card fields.

**Meta:** `applied_filters.months`; invalid `months` → fallback `4` and `ignored_filters: ["months"]`.

**Cache:** Redis cache-aside (see [Caching](#caching-trending-only)).

---

### `GET /api/v4/rent/new-releases`

**Business logic:** Titles **added to the catalog** recently, not titles with recent rental activity. Distinct from trending.

**Query parameters:** Same `months`, `page`, `limit` as trending.

**SQL strategy:** Select eligible audiobooks where `created_at >= NOW() - INTERVAL ? MONTH`, order by `created_at DESC`.

**Meta:** Same `applied_filters` / `ignored_filters` pattern for `months`.

**No caching.**

---

### `GET /api/v4/rent/all`

**Business logic:** Full rent catalog browse. Optional narrowing by category or channel.

**Query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | 1-based page |
| `limit` | `20` | Page size (1–100) |
| `category_id` | — | Optional exact match on `audiobooks.category_id` |
| `channel_id` | — | Optional exact match on `audiobooks.channel_id` |

Filters are **additive** (AND). Omitted filters mean no restriction on that dimension.

**SQL strategy:** Eligible audiobooks + optional `category_id` / `channel_id` predicates, order by `created_at DESC`.

**Meta:**

```json
{
  "applied_filters": { "category_id": null, "channel_id": 5 },
  "ignored_filters": ["category_id"]
}
```

`null` in `applied_filters` means the param was not provided. Invalid non-numeric params are dropped and named in `ignored_filters`.

**No caching.**

---

### `GET /api/v4/rent/search`

**Business logic:** Prefix search across Bengali/English title and author names for rent-eligible titles only.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Raw search string |
| `page` | No | Default `1` |
| `limit` | No | Default `20` |

**Validation:**

- Missing or blank `q` → **400** `"Query param \"q\" is required"`
- After sanitization, no tokens ≥ 3 chars → **400** `"No valid search terms after sanitization"`

**SQL strategy:** MySQL `MATCH(a.name, a.author_name, a.en_name) AGAINST (? IN BOOLEAN MODE)` with eligibility filter. Order by `relevance DESC`.

**Index:** Uses `ft_audiobooks_search` — see [Database indexing](#database-indexing). `en_author_name` is **not** in the FULLTEXT index.

**No caching.**

---

## Response contract

All successful responses:

```json
{
  "success": true,
  "data": [ /* audiobook cards */ ],
  "meta": {
    "total": 137,
    "page": 1,
    "limit": 20,
    "total_pages": 7,
    "applied_filters": { },
    "ignored_filters": []
  }
}
```

| Field | Notes |
|-------|-------|
| `total` | Total matching rows (not just current page) |
| `total_pages` | `Math.max(1, ceil(total / limit))` — always ≥ 1 |
| `applied_filters` | Present on trending, new-releases, all |
| `ignored_filters` | Omitted when empty |

Errors use `ResponseUtils.respondError` with standard HTTP status codes (400, 500).

---

## Pagination & filter handling

Implemented in `RentController` (`src/controllers/rent-controller.js`):

**Pagination (`parsePagination`):**

- `limit`: `parseInt` or default `20`, clamped to `[1, 100]`
- `page`: `parseInt` or default `1`, minimum `1`
- `offset`: `(page - 1) * limit`

**Optional integers (`parseOptionalInt`):**

- Missing / empty → `{ value: undefined, ignored: false }`
- Non-numeric → `{ value: undefined, ignored: true }`
- Valid integer → `{ value: parsed, ignored: false }`

**Months special case:** If provided but `<= 0`, reset to default `4` and mark `months` as ignored.

---

## Caching (trending only)

**File:** `src/utils/rent-trending-cache-utils.js`

**Pattern:** Cache-aside in `getTrending`:

```
1. Build key from (months, page, limit)
2. Redis GET → hit → return cached JSON immediately
3. Miss → query DB → build response → SETEX async (fire-and-forget)
```

| Setting | Value |
|---------|-------|
| TTL | 1800 seconds (30 minutes) |
| Key format | `cache:trending_rent:{months}:{page}:{limit}` |
| Value | Full API response object (serialized JSON) |

**Graceful degradation:** Redis errors on get/set are logged and swallowed; request falls through to DB. No cache invalidation on new rentals — freshness is TTL-bound only.

**Redis client:** `src/utils/redis-client.js` (TLS, env-driven host/port/credentials).

---

## Search

**Sanitizer:** `src/utils/search-sanitize.js` → `toBooleanModeQuery(rawTerm, minTokenSize = 3)`

1. Trim input
2. Strip MySQL boolean-mode special chars: `+ - > < ( ) ~ * " @`
3. Split on whitespace
4. Drop tokens shorter than 3 characters
5. Append `*` to each remaining token (prefix match)
6. Join with spaces

**Example:** `q=Atomic Habits` → boolean query `Atomic* Habits*`

**Security:** User input is never passed raw into `AGAINST`; only sanitized boolean-mode strings are bound as parameters.

---

## Architecture & file map

```
app.js
  └── mounts /api/v4/rent

src/routers/v4/rent-router.js
  ├── GET /trending      → RentController.getTrending
  ├── GET /new-releases  → RentController.getNewReleases
  ├── GET /search        → RentController.searchRentAudiobooks
  └── GET /all           → RentController.getAllRentals

src/controllers/rent-controller.js
  ├── parsePagination, parseOptionalInt, buildResponse
  ├── cache read/write (trending)
  └── delegates SQL to RentModel

src/data/models/rent-model.js
  ├── getTrending / getTrendingCount
  ├── getNewReleases / getNewReleasesCount
  ├── getAllRentals / getAllRentalsCount / buildAllRentalsFilters
  └── searchRentAudiobooks / searchRentAudiobooksCount

src/utils/rent-trending-cache-utils.js
  └── getTrendingCache, setTrendingCache, trendingCacheKey

src/utils/search-sanitize.js
  └── toBooleanModeQuery

src/swagger/rent-swagger-schemas.js
  └── OpenAPI parameters & response schemas (JSDoc)
```

**Request flow (trending, cache miss):**

```
Client → rent-router → rent-controller
  → getTrendingCache (miss)
  → Promise.all([RentModel.getTrending, RentModel.getTrendingCount])
  → buildResponse
  → setTrendingCache (async)
  → ResponseUtils.respond(200)
```

---

## Database dependencies

| Table | Role in this module |
|-------|---------------------|
| `audiobooks` | Source of catalog cards; eligibility flags |
| `audiobooks_rent` | Trending signal (paid rental counts) |

**Trending count query** uses `COUNT(DISTINCT audiobook_id)` so each title counts once regardless of rental volume when reporting `meta.total`.

Index requirements and query plans are documented in [Database indexing](#database-indexing).

---

## Database indexing

Indexes are critical for rent endpoint performance. None of these are defined in this repo's `migrations/` folder — they exist on the production/staging database and must be present (or created manually) in any new environment.

### Index summary

| Index | Table | Type | Columns | Used by |
|-------|-------|------|---------|---------|
| `idx_rent_trending` | `audiobooks_rent` | BTREE | `(created_at, payment_id, audiobook_id)` | `trending` |
| `ft_audiobooks_search` | `audiobooks` | FULLTEXT | `(name, author_name, en_name)` | `search` |
| `idx_audiobooks_rent_publish` | `audiobooks` | BTREE | `(for_rent, deleted, approval_status, publish_year, created_at)` | `new-releases`, `all` (no category/channel) |
| `category_id` | `audiobooks` | BTREE | `(category_id)` | `all` when `category_id` filter set |
| `channel_id` | `audiobooks` | BTREE | `(channel_id)` | `all` when `channel_id` filter set |

### `audiobooks_rent` — trending

**Index:** `idx_rent_trending (created_at, payment_id, audiobook_id)`

Supports the trending subquery filter on `created_at` range + `payment_id IS NOT NULL`, plus `GROUP BY audiobook_id`.

```sql
CREATE INDEX idx_rent_trending
  ON audiobooks_rent (created_at, payment_id, audiobook_id);
```

**Observed EXPLAIN (trending aggregation):**

| key | type | notes |
|-----|------|-------|
| `idx_rent_trending` | `range` | `Using where; Using index; Using temporary; Using filesort` |

`Using temporary` / `Using filesort` appear because of `GROUP BY` + `ORDER BY rent_count DESC`. Acceptable at current scale; trending is also Redis-cached for 30 minutes.

### `audiobooks` — FULLTEXT search

**Index:** `ft_audiobooks_search (name, author_name, en_name)`

Required for `MATCH(a.name, a.author_name, a.en_name) AGAINST (? IN BOOLEAN MODE)`. Must include `en_name` so English-title prefix search works (e.g. `q=Atomic` matching `en_name = "Atomic Habits"`).

```sql
CREATE FULLTEXT INDEX ft_audiobooks_search
  ON audiobooks (name, author_name, en_name);
```

**Not indexed for search:** `en_author_name` (not in FULLTEXT; would require a separate index change).

**Observed EXPLAIN (search):**

| key | type | notes |
|-----|------|-------|
| `ft_audiobooks_search` | `fulltext` | `Using where; Ft_hints: sorted` |

### `audiobooks` — catalog listing (new-releases & all)

**Index:** `idx_audiobooks_rent_publish (for_rent, deleted, approval_status, publish_year, created_at)`

Composite index whose **leading columns** match the eligibility `WHERE` clause (`for_rent`, `deleted`, `approval_status`). `new-releases` and `all` no longer filter on `publish_year`; the index name is historical but the prefix still drives `type=ref` access.

```sql
CREATE INDEX idx_audiobooks_rent_publish
  ON audiobooks (for_rent, deleted, approval_status, publish_year, created_at);
```

**Observed EXPLAIN:**

| Endpoint | key | type | notes |
|----------|-----|------|-------|
| `new-releases` | `idx_audiobooks_rent_publish` | `ref` | `Using where; Using index; Using filesort` |
| `all` (no filters) | `idx_audiobooks_rent_publish` | `ref` | `Using index; Using filesort` |

`Using filesort` is expected for `ORDER BY created_at DESC` when the range scan does not fully cover sort order.

**Optional cleanup:** `publish_year` is unused in current rent queries. Dropping and recreating this index without `publish_year` is safe but **not required** — optional DBA maintenance:

```sql
-- optional; not applied in this codebase
DROP INDEX idx_audiobooks_rent_publish ON audiobooks;
CREATE INDEX idx_audiobooks_rent_catalog
  ON audiobooks (for_rent, deleted, approval_status, created_at);
```

### `audiobooks` — category / channel filters (`all`)

When `category_id` or `channel_id` is provided, MySQL may prefer the single-column indexes over the composite rent index:

| Filter | key | type |
|--------|-----|------|
| `category_id = ?` | `category_id` | `ref` |
| `channel_id = ?` | `channel_id` | `ref` |

These are existing table indexes, not rent-specific migrations.

### Verifying indexes

```sql
SHOW INDEX FROM audiobooks_rent;
SHOW INDEX FROM audiobooks;

EXPLAIN SELECT ... -- paste query from rent-model.js
```

### Redis (not MySQL)

Trending response cache is separate from DB indexing:

| Key pattern | TTL |
|-------------|-----|
| `cache:trending_rent:{months}:{page}:{limit}` | 1800 s |

See [Caching (trending only)](#caching-trending-only).

---

## Swagger

Interactive docs are generated from JSDoc in:

- `src/routers/v4/rent-router.js` — route definitions
- `src/swagger/rent-swagger-schemas.js` — shared parameters and schemas

Tagged under **Rent** in Swagger UI. Server URL in docs: `http://localhost:8080/api/v4`.

---

## Operational notes

- **Restart** the Node process after code changes.
- **Redis optional for availability** — trending works without cache; only latency differs.
- **Trending vs new-releases:** Trending = popular by rental activity. New-releases = recently catalogued. Same `months` param, different semantics.
- **Trending vs all:** Trending only includes titles with at least one paid rental in the window. All includes every eligible title.
- **Purchase / entitlement** checks are not part of this module. See `audiobook-model.js`, `bkash-model.js`, `nagad-model.js`, and related payment models for `audiobooks_rent` inserts and active-rent lookups.

---

## Out of scope

This module intentionally does **not** implement:

- Creating or extending rentals
- Payment webhooks or checkout
- Cache for new-releases, all, or search
- Cache invalidation on rental events
- Cursor-based pagination
- Auth / per-user rent status on list endpoints
- `en_author_name` in FULLTEXT search

For those behaviors, refer to the respective payment and audiobook modules elsewhere in the codebase.
