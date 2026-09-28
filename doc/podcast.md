# Podcast API — Business Logic & Implementation

Standalone podcast catalog module. Mounted at **`/api/v1/podcasts`**. Supports public discovery (list, search), authenticated detail and reactions, admin CRUD, and Redis-backed engagement counters flushed to MySQL on a schedule.

**Not the same as legacy podcast audiobooks:** Older RSS/import flows store episodes in `audiobooks` with `podcast = 1`. This module uses dedicated tables (`podcast`, `tag`, `podcast_tag`, `podcast_reaction`). Data in `audiobooks` is **not** searchable or listable through these endpoints.

---

## Table of contents

1. [Overview](#overview)
2. [Domain concepts](#domain-concepts)
3. [Authentication & access control](#authentication--access-control)
4. [Premium gating (`podcast_url`)](#premium-gating-podcast_url)
5. [API endpoints](#api-endpoints)
6. [Response contract](#response-contract)
7. [Pagination](#pagination)
8. [Search](#search)
9. [Reactions (like / dislike)](#reactions-like--dislike)
10. [Tags](#tags)
11. [Engagement counts (Redis write-behind)](#engagement-counts-redis-write-behind)
12. [Trending (hot ranking)](#trending-hot-ranking)
13. [Similar recommendations](#similar-recommendations)
14. [Admin CRUD](#admin-crud)
15. [Architecture & file map](#architecture--file-map)
16. [Database schema](#database-schema)
17. [Database indexing](#database-indexing)
18. [Migrations](#migrations)
19. [Swagger](#swagger)
20. [Operational notes](#operational-notes)
21. [Out of scope](#out-of-scope)

---

## Overview

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/podcasts` | GET | Optional | Paginated catalog, optional tag filter |
| `/api/v1/podcasts/search` | GET | Optional | FULLTEXT search on title + description |
| `/api/v1/podcasts` | POST | Admin | Create podcast + tags |
| `/api/v1/podcasts/{id}` | GET | Required | Detail, tags, playback URL (if entitled) |
| `/api/v1/podcasts/{id}` | PATCH | Admin | Partial update |
| `/api/v1/podcasts/{id}` | DELETE | Admin | Hard delete |
| `/api/v1/podcasts/{id}/similar` | GET | Required | Tag-overlap recommendations |
| `/api/v1/podcasts/{id}/like` | POST | Required | Like / toggle / switch from dislike |
| `/api/v1/podcasts/{id}/dislike` | POST | Required | Dislike / toggle / switch from like |
| `/api/v1/podcasts/cronjob/count-flush` | GET | Admin | Manual Redis → MySQL count flush |
| `/api/v1/podcasts/cronjob/recompute-trending` | GET | Admin | Manual trending score recompute |

**Mount point** (`app.js`):

```js
app.use(constants.API + constants.VERSION_1 + '/podcasts', podcastRouter);
// → /api/v1/podcasts/*
```

**Route registration order:** `GET /search` is registered **before** `GET /:id` so `search` is not captured as an id. Verified in `podcast-model.test.js`.

---

## Domain concepts

### Podcast

A first-class content row in table `podcast`. Admin supplies a hosted audio URL (`podcast_url`); there is **no** multipart upload endpoint. Fields exposed to clients:

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | Primary key |
| `title` | string | Max 500 chars |
| `description` | string \| null | Free text |
| `is_premium` | 0 \| 1 | Gates `podcast_url` on detail/similar |
| `podcast_url` | string \| null | Playback URL; see [Premium gating](#premium-gating-podcast_url) |
| `like_count` | int | Denormalized; includes pending Redis deltas on read |
| `dislike_count` | int | Same |
| `comment_count` | int | Denormalized; **no write path in this module yet** |
| `view_count` | int | Incremented on each successful detail fetch |
| `user_reaction` | `'like'` \| `'dislike'` \| null | Caller's reaction when join is present |
| `created_at` / `updated_at` | ISO UTC | Detail/admin responses only |
| `shared_tag_count` | int | Similar endpoint only |

### Tag

Normalized labels in table `tag` (`name`, `slug`). Linked to podcasts via `podcast_tag`. Tags are **shared** across podcasts (upsert by slug on create/update).

### Reaction (`podcast_reaction`)

One row per `(user_id, podcast_id)` with `reaction_type` ∈ `{ like, dislike }`. Unique constraint enforces at most one reaction per user per podcast.

### List vs detail field policy

| Endpoint group | `podcast_url` | `user_reaction` |
|----------------|---------------|-----------------|
| List, search | Always `null` | Populated when Bearer token present |
| Detail, similar | Premium-gated | Populated (auth required) |
| Admin create/update response | Full URL returned | N/A |

---

## Authentication & access control

| Middleware | Used on | Behavior |
|------------|---------|----------|
| `authorizeOptional` | `GET /`, `GET /search` | No token → `req.currentUser = null`, request continues. Invalid token → also continues with null (no 401). Valid token → hydrates `req.currentUser`. |
| `authorize` | Detail, similar, like, dislike | Missing/invalid token → **401**. |
| `authorizeAdmin` | POST, PATCH, DELETE, count-flush | Requires JWT with admin role (`role = 2`). |

Optional auth exists solely to populate `user_reaction` on list/search without forcing login.

---

## Premium gating (`podcast_url`)

Implemented in `applyPremiumAccess` (`src/utils/podcast-reaction-utils.js`):

```js
if (row.is_premium && currentUser.is_subscribed !== 1) {
  return { ...row, podcast_url: null };
}
```

| `is_premium` | `is_subscribed` | `podcast_url` on detail/similar |
|--------------|-----------------|----------------------------------|
| 0 | any | Returned |
| 1 | 1 | Returned |
| 1 | ≠ 1 | `null` |

List and search **always** null out `podcast_url` in the controller regardless of subscription — clients must open detail for playback.

---

## API endpoints

### `GET /api/v1/podcasts`

**Business logic:** Full catalog browse. Default sort is `recent` (`id DESC`). Use `sort=trending` for hot-ranked podcasts. Optional exact filter on tag slug.

**Query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | 1-based page (invalid → clamp to 1) |
| `limit` | `10` | Page size, clamped 1–50 |
| `tag` | — | Optional tag slug (exact match on `tag.slug`) |
| `sort` | `recent` | `recent` (`id DESC`) or `trending` (`trending_score DESC, id DESC`). Unknown → **400** `INVALID_SORT` |

**SQL strategy:**

- Count: `COUNT(DISTINCT p.id)` with optional `INNER JOIN podcast_tag` + `tag`.
- List: same joins + optional `LEFT JOIN podcast_reaction` when authenticated.
- Order: `p.id DESC` (recent) or `p.trending_score DESC, p.id DESC` (trending).

**Response:** List envelope; each row has `podcast_url: null` after `attachLiveCounts`.

---

### `GET /api/v1/podcasts/search`

**Business logic:** FULLTEXT prefix search across `title` and `description`, ranked by relevance then `id DESC`.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Search string (max 200 chars) |
| `page` | No | Default `1` |
| `limit` | No | Default `10`, max 50 |

**Validation:**

1. `PodcastValidator.validateSearchQuery` — missing/blank/too-long `q` → **400**
2. `toBooleanModeQuery(q)` — no tokens ≥ 3 chars after sanitization → **400** `"No valid search terms after sanitization"`

**SQL strategy:**

```sql
MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE)
```

Count and list queries run in parallel. List query placeholder order (authenticated):

1. Relevance `MATCH` → `q`
2. Reaction join `pr.user_id` → `userId`
3. Where `MATCH` → `q`
4. `LIMIT`, `OFFSET`

**Index:** Requires `ft_podcast_search` — see [Database indexing](#database-indexing).

**Response:** Same list envelope as catalog; `podcast_url` forced to `null`.

---

### `GET /api/v1/podcasts/{id}`

**Business logic:** Full metadata + tags + caller's reaction. Increments view count on every successful fetch (no per-user dedup).

**Flow:**

1. Validate `id` (positive integer).
2. `PodcastModel.findById(id, userId)` — 404 if missing.
3. `incrementViewCountDelta(id)` in Redis (errors logged, response still 200).
4. `applyPremiumAccess` for `podcast_url`.
5. `attachLiveCounts` for like/dislike/view.

**Response shape:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "...",
    "podcast_url": "https://...",
    "like_count": 128,
    "tags": [{ "id": 3, "name": "Technology", "slug": "technology" }]
  }
}
```

---

### `GET /api/v1/podcasts/{id}/similar`

**Business logic:** Recommend podcasts sharing ≥ 1 tag with source, excluding source. Rank by `shared_tag_count DESC`, then `id DESC`. Source with zero tags → empty `data`, `total: 0` (not an error). Source missing → **404**.

**SQL strategy:** Self-join on `podcast_tag` (`pt1` = source tags, `pt2` = candidate tags), `GROUP BY` candidate podcast, `COUNT(DISTINCT pt2.tag_id) AS shared_tag_count`.

**Premium:** Each row passed through `applyPremiumAccess` (unlike list/search).

---

### `POST /api/v1/podcasts/{id}/like` and `POST .../dislike`

**Business logic:** Toggle state machine inside a DB transaction. See [Reactions](#reactions-like--dislike).

**Response:**

```json
{
  "success": true,
  "data": {
    "like_count": 129,
    "dislike_count": 4,
    "user_reaction": "like"
  }
}
```

Counts include live Redis deltas via `attachLiveCounts` before returning.

---

### `POST /api/v1/podcasts` (admin)

**Business logic:** Create podcast row + link tags in one transaction.

**Required body fields:** `title`, `podcast_url` (valid URL with protocol).

**Optional:** `description`, `is_premium` (default 0), `tags` (array, max 20 strings).

**Tag handling:** `dedupeTagsBySlug` → upsert `tag` by slug → `INSERT IGNORE podcast_tag`.

**Response:** **201** with full admin detail (includes real `podcast_url` and tags).

---

### `PATCH /api/v1/podcasts/{id}` (admin)

**Business logic:** Partial update. Only keys present in body are written.

**Tags semantics:**

| Request body | Effect |
|--------------|--------|
| `tags` omitted | Existing tags unchanged |
| `"tags": []` | Remove all tag links |
| `"tags": ["A", "B"]` | Replace entire tag set |

Empty body → **400** `"At least one field is required"`.

---

### `DELETE /api/v1/podcasts/{id}` (admin)

**Business logic:** Hard delete podcast row. `podcast_tag` and `podcast_reaction` cascade via FK.

**Response:** **200** `{ success: true, message: "Podcast deleted successfully" }`.

---

### `GET /api/v1/podcasts/cronjob/count-flush` (admin)

**Business logic:** Manually trigger Redis → MySQL flush for pending engagement deltas. Skips primary-process check (`requirePrimary: false`).

---

## Response contract

### List / search / similar

```json
{
  "success": true,
  "data": [ /* podcast rows */ ],
  "page": 1,
  "limit": 10,
  "total": 42,
  "total_pages": 5
}
```

| Field | Notes |
|-------|-------|
| `total` | Matching rows across all pages |
| `total_pages` | `0` when `total === 0`, else `ceil(total / limit)` |

### Detail

```json
{
  "success": true,
  "data": { /* podcast fields + tags array */ }
}
```

### Reaction mutation

```json
{
  "success": true,
  "data": {
    "like_count": 128,
    "dislike_count": 4,
    "user_reaction": "like"
  }
}
```

### Errors

`ResponseUtils.respondError` — **400** validation, **401** auth, **404** not found, **500** internal.

---

## Pagination

Implemented in `PodcastController.parsePagination`:

- `page`: `parseInt` or default `1`, minimum `1`
- `limit`: `parseInt` or default `10`, clamped `[1, 50]`
- `offset`: `(page - 1) * limit`

Validator additionally rejects non-integer `page`/`limit` query strings with **400** when express-validator runs (list, search, similar).

---

## Search

**Sanitizer:** `src/utils/search-sanitize.js` → `toBooleanModeQuery(rawTerm, minTokenSize = 3)` (shared with rent search).

1. Trim input
2. Strip boolean-mode special chars: `+ - > < ( ) ~ * " @`
3. Split on whitespace
4. Drop tokens shorter than 3 characters
5. Append `*` to each remaining token (prefix match)
6. Join with spaces

**Examples:**

| Input `q` | Bound to `AGAINST` |
|-------------|-------------------|
| `podcast` | `podcast*` |
| `atomic habits` | `atomic* habits*` |
| `ab` | *(rejected at controller — 400)* |

**Security:** Only sanitized boolean-mode strings are bound as SQL parameters.

**MySQL requirement:** Composite FULLTEXT index on `(title, description)`. Without it, queries fail with `ER_CANT_FIND_FULLTEXT` (1191) → HTTP 500.

---

## Reactions (like / dislike)

**State machine** (`computeReactionTransition` in `podcast-reaction-utils.js`):

| Current | Action (like) | DB action | like Δ | dislike Δ | Result `user_reaction` |
|---------|---------------|-----------|--------|-----------|------------------------|
| none | like | insert | +1 | 0 | like |
| like | like | delete (toggle off) | -1 | 0 | null |
| dislike | like | update | +1 | -1 | like |
| none | dislike | insert | 0 | +1 | dislike |
| dislike | dislike | delete (toggle off) | 0 | -1 | null |
| like | dislike | update | -1 | +1 | dislike |

**Concurrency:**

1. Transaction opens.
2. `SELECT ... FOR UPDATE` on existing reaction row.
3. Apply insert / update / delete on `podcast_reaction`.
4. `incrementReactionDeltas` in Redis (not inline `UPDATE podcast` for counts).
5. Re-read base counts + merge Redis deltas for response.

**Race on insert:** `ER_DUP_ENTRY` → re-select and retry transition logic.

**Toggle off:** Same endpoint called twice removes the reaction.

---

## Tags

**Normalization** (`podcast-tag-utils.js`):

- `normalizeTagName` — trim, collapse whitespace
- `toTagSlug` — lowercase, strip non `[a-z0-9\s-]`, spaces → hyphens
- `dedupeTagsBySlug` — skip empty names, collapse case-insensitive slug duplicates (first wins)

**Persistence** (`linkTags` in model):

```sql
INSERT INTO tag (name, slug) VALUES (?, ?)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);

INSERT IGNORE INTO podcast_tag (podcast_id, tag_id) VALUES (?, ?);
```

Slug is the canonical identity; display `name` is stored on first insert.

---

## Engagement counts (Redis write-behind)

**File:** `src/utils/podcast-count-cache-utils.js`

High-traffic counters (`like_count`, `dislike_count`, `view_count`) use **write-behind** through Redis to avoid hot-row `UPDATE` on every view/reaction.

### Redis keys

| Key pattern | Purpose |
|-------------|---------|
| `podcast:{id}:like_count_delta` | Pending like delta |
| `podcast:{id}:dislike_count_delta` | Pending dislike delta |
| `podcast:{id}:view_count_delta` | Pending view delta |
| `podcasts:pending_count_flush` | SET of podcast ids with pending deltas |

### Write path

| Event | Function |
|-------|----------|
| Detail view | `incrementViewCountDelta(id)` |
| Reaction change | `incrementReactionDeltas(id, likeDelta, dislikeDelta)` |

Each increment also `SADD`s the podcast id to `pending_count_flush`.

### Read path

`attachLiveCounts(rows)` — `MGET` all delta keys for batch of ids, add to MySQL base counts. Redis failure → return base counts unchanged (logged).

### Flush path

`flushPendingCounts()`:

1. `SMEMBERS podcasts:pending_count_flush`
2. Per id: `GETSET` each delta key to `'0'` (atomic read-and-reset)
3. `UPDATE podcast SET like_count = GREATEST(like_count + ?, 0), ...` if any delta ≠ 0
4. Re-check deltas; `SREM` from pending set only when all three are zero (handles concurrent writes during flush)

### Scheduling

Registered in `podcast-router.js` via `node-cron`:

| Env var | Default | Effect |
|---------|---------|--------|
| `PODCAST_COUNT_FLUSH_ENABLED` | enabled | Set `'false'` to disable cron |
| `PODCAST_COUNT_FLUSH_CRON` | `5,35 * * * *` | Cron expression |

**Primary process guard:** `runScheduledCountFlush` skips when `process.env.name !== 'primary-kabbik-backend'` (PM2 cluster safety). Manual admin endpoint bypasses this.

**Overlap guard:** Concurrent flush invocations return `{ skipped: true, reason: 'overlap' }`.

### View count semantics

Every successful `GET /podcasts/{id}` increments view count — **no** per-user or per-session deduplication.

---

## Trending (hot ranking)

Reddit-style hot score on `podcast.trending_score`, recomputed on a schedule. Unlike posts (pure SQL recompute), podcasts merge pending Redis like/view deltas at compute time via `attachLiveCounts`.

### Formula

Comments are **excluded** — `comment_count` has no write path yet.

```
engagement = (like_count * 1) + (view_count * 0.1)
trending_score = LOG10(GREATEST(engagement, 1)) + (UNIX_TIMESTAMP(created_at) / 45000)
```

`like_count` and `view_count` in the formula are **merged** values: MySQL base + pending Redis deltas (same merge as API responses).

### Recompute job

File: `src/utils/podcast-trending-utils.js`

Memory-safe batched recompute (keyset pagination, not full-table load):

1. **Keyset read loop:** `SELECT ... FROM podcast WHERE id > ? ORDER BY id ASC LIMIT ?` — constant-cost batches, no `OFFSET`
2. **`attachLiveCounts`** per batch for Redis merge (like/view only; dislike delta ignored in formula)
3. Compute score in JS per row
4. One bulk `UPDATE` per batch via `CASE id WHEN ? THEN ? ...`
5. **`setImmediate` yield** between batches so the API stays responsive during long runs

| Env var | Default | Effect |
|---------|---------|--------|
| `PODCAST_TRENDING_BATCH_SIZE` | `1000` | Rows per read/update batch; lower (e.g. `500`) if memory pressure |
| `PODCAST_TRENDING_DURATION_WARN_MS` | `120000` | Log a slow-run warning if job exceeds this duration (ms) |

Each run logs `updated`, `duration`, and RSS before/after. Overlap guard is **in-process** (same pattern as post trending) — concurrent runs in the same process return `{ skipped: true, reason: 'overlap' }`. PM2 primary-process guard prevents duplicate cron ticks across workers.

### Scheduling

Registered in `podcast-router.js` via `node-cron` (independent of count-flush cron):

| Env var | Default | Effect |
|---------|---------|--------|
| `PODCAST_TRENDING_RECOMPUTE_ENABLED` | enabled | Set `'false'` to disable cron |
| `PODCAST_TRENDING_RECOMPUTE_CRON` | `*/15 * * * *` | Cron expression |

**Primary process guard:** `runScheduledTrendingRecompute` skips when `process.env.name !== 'primary-kabbik-backend'`. Manual admin endpoint bypasses this.

**Admin trigger:** `GET /api/v1/podcasts/cronjob/recompute-trending` (`authorizeAdmin`).

### Score vs displayed counts

List responses still call `attachLiveCounts` for displayed `like_count` / `view_count`. Those can be fresher than `trending_score` until the next recompute — same caveat as community post trending.

---

## Similar recommendations

**Algorithm:** Tag overlap count (content-based), not collaborative filtering.

```
source podcast tags  →  pt1
other podcasts       →  pt2 (same tag_id, different podcast_id)
rank by COUNT(DISTINCT shared tags) DESC, id DESC
```

Podcast with no tags produces zero join rows → empty result set.

---

## Admin CRUD

| Operation | Transaction | Notes |
|-----------|-------------|-------|
| Create | Yes | Insert podcast + link tags |
| Update | Yes | Patch fields; optional full tag replace |
| Delete | Yes | Single `DELETE FROM podcast` (cascades) |

Admin responses use `buildAdminDetailResponse` — always includes real `podcast_url` and `tags` (no premium gating on admin reads).

**Auth:** `authorizeAdmin` — role 2. Dev bootstrap: `POST /auth/dev/bootstrap-admin` (see Swagger `adminBearerAuth`).

---

## Architecture & file map

```
app.js
  └── mounts /api/v1/podcasts

src/routers/v1/podcast-router.js
  ├── cron: runScheduledCountFlush, runScheduledTrendingRecompute (node-cron)
  ├── GET  /                     → listPodcasts        (authorizeOptional)
  ├── GET  /search               → searchPodcasts      (authorizeOptional)
  ├── POST /                     → createPodcast       (authorizeAdmin)
  ├── GET  /:id/similar          → getSimilarPodcasts  (authorize)
  ├── POST /:id/like             → likePodcast         (authorize)
  ├── POST /:id/dislike          → dislikePodcast      (authorize)
  ├── PATCH /:id                 → updatePodcast       (authorizeAdmin)
  ├── DELETE /:id                → deletePodcast       (authorizeAdmin)
  ├── GET  /:id                  → getPodcast          (authorize)
  ├── GET  /cronjob/count-flush  → flushCountDeltas    (authorizeAdmin)
  └── GET  /cronjob/recompute-trending → recomputeTrendingScoresHandler (authorizeAdmin)

src/controllers/podcast-controller.js
  ├── parsePagination, buildListResponse, buildAdminDetailResponse
  ├── CRUD + search + detail + similar + reactions
  └── runScheduledCountFlush, flushCountDeltas, runScheduledTrendingRecompute

src/utils/podcast-trending-utils.js
  └── recomputePodcastTrendingScores (Redis-merged hot score)

src/data/models/podcast-model.js
  ├── createPodcast, updatePodcast, deletePodcast
  ├── findAll, search, findById, findSimilar
  ├── toggleReaction, applyTransition
  └── buildReactionJoin, linkTags, mapPodcastRow

src/validators/podcast-validator.js
  └── express-validator rules for body, query, id param

src/utils/podcast-count-cache-utils.js
  └── Redis deltas, attachLiveCounts, flushPendingCounts

src/utils/podcast-reaction-utils.js
  └── computeReactionTransition, applyPremiumAccess

src/utils/podcast-tag-utils.js
  └── normalizeTagName, toTagSlug, dedupeTagsBySlug

src/utils/search-sanitize.js
  └── toBooleanModeQuery (shared with rent module)

src/swagger/podcast-swagger-schemas.js
  └── OpenAPI parameters & response schemas (JSDoc)
```

**Request flow (detail):**

```
Client → podcast-router → podcast-controller.getPodcast
  → PodcastModel.findById
  → incrementViewCountDelta (Redis)
  → applyPremiumAccess
  → attachLiveCounts
  → ResponseUtils.respond(200)
```

**Request flow (reaction):**

```
Client → mutateReaction
  → PodcastModel.toggleReaction (transaction + FOR UPDATE)
  → incrementReactionDeltas (Redis)
  → attachLiveCounts (response counts)
  → ResponseUtils.respond(200)
```

---

## Database schema

Defined in `migrations/20260825_create_podcast_tables.sql`.

### `podcast`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | INT UNSIGNED | auto | PK |
| `title` | VARCHAR(500) | — | Required |
| `description` | TEXT | NULL | |
| `is_premium` | TINYINT | 0 | |
| `podcast_url` | VARCHAR(2048) | NULL | Hosted audio URL |
| `like_count` | INT UNSIGNED | 0 | Denormalized |
| `dislike_count` | INT UNSIGNED | 0 | Denormalized |
| `comment_count` | INT UNSIGNED | 0 | No API writer yet |
| `view_count` | INT UNSIGNED | 0 | |
| `trending_score` | DOUBLE | 0 | Precomputed hot rank; see [Trending](#trending-hot-ranking) |
| `trending_updated_at` | TIMESTAMP | NULL | Last recompute time |
| `created_at` | TIMESTAMP | CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | on update | |

### `tag`

| Column | Notes |
|--------|-------|
| `slug` | UNIQUE (`uq_tag_slug`) |
| `name` | Display label |

### `podcast_tag`

M:N link. `UNIQUE (podcast_id, tag_id)`. CASCADE delete when podcast or tag removed.

### `podcast_reaction`

| Column | Notes |
|--------|-------|
| `reaction_type` | ENUM('like', 'dislike') |
| UNIQUE (`user_id`, `podcast_id`) | One reaction per user |

FK: `podcast_id` → `podcast(id)` ON DELETE CASCADE; `user_id` → `users(id)` ON DELETE CASCADE.

---

## Database indexing

| Index | Table | Type | Columns | Used by |
|-------|-------|------|---------|---------|
| `idx_podcast_created_at` | `podcast` | BTREE | `(created_at)` | Future time-based queries |
| `idx_podcast_trending` | `podcast` | BTREE | `(trending_score DESC, id DESC)` | `GET /podcasts?sort=trending` |
| `ft_podcast_search` | `podcast` | FULLTEXT | `(title, description)` | `search` |
| `uq_tag_slug` | `tag` | UNIQUE | `(slug)` | Tag upsert, list filter |
| `uq_user_podcast` | `podcast_reaction` | UNIQUE | `(user_id, podcast_id)` | Reaction toggle |
| `idx_podcast_tag_podcast_id` | `podcast_tag` | BTREE | `(podcast_id)` | Tag joins, similar |
| `idx_podcast_tag_tag_id` | `podcast_tag` | BTREE | `(tag_id)` | Similar self-join |

### FULLTEXT search (required)

```sql
ALTER TABLE podcast
  ADD FULLTEXT INDEX ft_podcast_search (title, description);
```

Migration file: `migrations/20260827_add_podcast_fulltext_index.sql`.

`MATCH(p.title, p.description)` requires a **composite** index on both columns. Index on `title` alone is insufficient.

**Verify:**

```sql
SHOW INDEX FROM podcast WHERE Index_type = 'FULLTEXT';

SELECT id, title
FROM podcast
WHERE MATCH(title, description) AGAINST ('podcast*' IN BOOLEAN MODE);
```

---

## Migrations

Apply manually in order:

```bash
mysql -u <user> -p <database> < migrations/20260825_create_podcast_tables.sql
mysql -u <user> -p <database> < migrations/20260827_add_podcast_fulltext_index.sql
mysql -u <user> -p <database> < migrations/20260910_podcast_trending.sql
```

`20260826_add_podcast_view_count_and_timestamps.sql` is for environments where `podcast` was created **before** `view_count` / timestamp columns were added to the base migration. Skip steps that already exist.

`20260910_podcast_trending.sql` adds `trending_score`, `trending_updated_at`, and `idx_podcast_trending`. Run before enabling the recompute cron.

---

## Swagger

OpenAPI definitions:

- `src/routers/v1/podcast-router.js` — route-level JSDoc
- `src/swagger/podcast-swagger-schemas.js` — shared parameters & schemas

Registered in `src/swagger/swagger.config.js`. Tag: **Podcasts**.

---

## Operational notes

### Environment variables

| Variable | Purpose |
|----------|---------|
| `PODCAST_COUNT_FLUSH_ENABLED` | `'false'` disables scheduled flush |
| `PODCAST_COUNT_FLUSH_CRON` | Override cron schedule |
| `PODCAST_TRENDING_RECOMPUTE_ENABLED` | `'false'` disables scheduled trending recompute |
| `PODCAST_TRENDING_RECOMPUTE_CRON` | Override trending recompute schedule (default `*/15 * * * *`) |
| `PODCAST_TRENDING_BATCH_SIZE` | Rows per keyset batch during recompute (default `1000`) |
| `PODCAST_TRENDING_DURATION_WARN_MS` | Slow-run warning threshold in ms (default `120000`) |
| `process.env.name` | PM2 process name; only `primary-kabbik-backend` runs scheduled flush and trending recompute |
| Redis env (via `redis-client.js`) | Required for live counts and flush |

### Redis unavailable

- **Reads:** `attachLiveCounts` falls back to MySQL base counts.
- **Writes:** View/reaction increments throw; detail still returns 200 (view increment errors logged). Reaction endpoint returns 500 if Redis fails during delta write.

### Troubleshooting empty search

1. Confirm row exists in `podcast` (not only `audiobooks`):
   ```sql
   SELECT id, title FROM podcast WHERE title LIKE '%your term%';
   ```
2. Confirm FULLTEXT index exists (see above).
3. Test sanitized query: `podcast` → `podcast*`.
4. If authenticated in Swagger, bind-order bug was fixed — ensure latest code is deployed.

### Tests

```bash
npm test
```

Covers model SQL params, reaction state machine, count cache flush, search sanitization, controller search 400/200 paths, route ordering.

---

## Out of scope

| Feature | Where / status |
|---------|----------------|
| Legacy RSS podcast import | `audiobook-controller`, `audiobooks.podcast = 1` |
| Comment CRUD | `comment_count` column exists; no endpoints |
| Audio upload | Admin passes `podcast_url` only |
| Payment / subscription purchase | Uses existing `users.is_subscribed` flag |
| Full-text on tags | Search is title + description only |
| Cursor pagination | Offset-based only |
| Search result caching | None (unlike rent trending) |

**Distinction:** A title like *"Kabbik Podcast Season 01 Episode 01"* in the old `audiobooks` table will **not** appear in `GET /api/v1/podcasts/search` until it is created in the `podcast` table via admin API or data migration.
