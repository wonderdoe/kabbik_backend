const router = require('express').Router();
const cron = require('node-cron');
const PodcastController = require('../../controllers/podcast-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeOptional = require('../../middlewares/auth-optional-middleware');
const LoggerError = require('../../utils/logger-error');

const runCountFlushSafely = (fn) => {
  void fn().catch((err) => {
    console.error('[podcast-cron:count-flush] unhandled rejection:', err);
    LoggerError.log(err);
  });
};

const runTrendingSafely = (fn) => {
  void fn().catch((err) => {
    console.error('[podcast-cron:trending] unhandled rejection:', err);
    LoggerError.log(err);
  });
};

// Production: PODCAST_COUNT_FLUSH_ENABLED=true, optional PODCAST_COUNT_FLUSH_CRON=5,35 * * * *
if (process.env.PODCAST_COUNT_FLUSH_ENABLED !== 'false') {
  const flushCronSchedule = process.env.PODCAST_COUNT_FLUSH_CRON || '5,35 * * * *';
  cron.schedule(flushCronSchedule, () => {
    runCountFlushSafely(() => PodcastController.runScheduledCountFlush());
  });
}

if (process.env.PODCAST_TRENDING_RECOMPUTE_ENABLED !== 'false') {
  const trendingCronSchedule = process.env.PODCAST_TRENDING_RECOMPUTE_CRON || '*/15 * * * *';
  cron.schedule(trendingCronSchedule, () => {
    runTrendingSafely(() => PodcastController.runScheduledTrendingRecompute());
  });
}

/**
 * @swagger
 * tags:
 *   name: Podcasts
 *   description: |
 *     Podcast discovery, detail, similar recommendations, and like/dislike reactions.
 *
 *     **Authentication**
 *     - `GET /podcasts` and `GET /podcasts/search` — public with optional Bearer token (for `user_reaction`).
 *     - `POST`, `PATCH`, `DELETE` — admin only (role=2); bootstrap via `POST /auth/dev/bootstrap-admin` (dev) or login via `POST /auth/login-admin`, then use **adminBearerAuth** in Swagger Authorize.
 *     - All other read/reaction endpoints require a valid JWT.
 *
 *     **Playback URL (`podcast_url`)**
 *     - List: always `null` on every row.
 *     - Detail & similar: returned when free or user is subscribed; `null` for premium + non-subscriber.
 *
 *     **Reactions**
 *     - `POST /like` and `POST /dislike` toggle off when the same reaction is sent twice.
 *     - Switching like ↔ dislike updates counts atomically inside a transaction.
 */

/**
 * @swagger
 * /podcasts:
 *   get:
 *     summary: List podcasts
 *     description: |
 *       Returns a paginated podcast catalog. Default sort is `recent` (`id` descending).
 *       Use `sort=trending` for hot-ranked podcasts.
 *
 *       - **Auth:** optional. Pass `Authorization: Bearer <token>` to populate `user_reaction` per row.
 *       - **`podcast_url`:** always `null` on list rows — never exposed in list view.
 *       - **Tag filter:** pass `?tag=<slug>` to restrict to podcasts linked to that tag.
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastPageQuery'
 *       - $ref: '#/components/parameters/PodcastLimitQuery'
 *       - $ref: '#/components/parameters/PodcastTagSlugQuery'
 *       - $ref: '#/components/parameters/PodcastSortQuery'
 *     responses:
 *       200:
 *         description: Paginated podcast list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastListResponse'
 *             example:
 *               data:
 *                 - id: 42
 *                   title: Episode 12 — Building Better Habits
 *                   description: A deep dive into habit formation.
 *                   is_premium: 1
 *                   podcast_url: null
 *                   thumb_url: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *                   like_count: 128
 *                   dislike_count: 4
 *                   comment_count: 23
 *                   user_reaction: like
 *               page: 1
 *               limit: 10
 *               total: 42
 *               total_pages: 5
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authorizeOptional, PodcastController.listPodcasts);

/**
 * @swagger
 * /podcasts/search:
 *   get:
 *     summary: Search podcasts
 *     description: |
 *       FULLTEXT boolean-mode search over `title` and `description`, ranked by relevance then `id` descending.
 *
 *       - **Auth:** optional. Pass `Authorization: Bearer <token>` to populate `user_reaction` per row.
 *       - **`podcast_url`:** always `null` on search rows — never exposed in list view.
 *       - **Query:** pass search term via `q`; tokens are sanitized to boolean-mode prefix queries (same as rent search).
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastSearchQuery'
 *       - $ref: '#/components/parameters/PodcastPageQuery'
 *       - $ref: '#/components/parameters/PodcastLimitQuery'
 *     responses:
 *       200:
 *         description: Paginated search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastListResponse'
 *             example:
 *               data:
 *                 - id: 42
 *                   title: Episode 12 — Building Better Habits
 *                   description: A deep dive into habit formation.
 *                   is_premium: 1
 *                   podcast_url: null
 *                   thumb_url: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *                   like_count: 128
 *                   dislike_count: 4
 *                   comment_count: 23
 *                   user_reaction: like
 *               page: 1
 *               limit: 10
 *               total: 3
 *               total_pages: 1
 *       400:
 *         description: Missing, empty, or too-long search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/search', authorizeOptional, PodcastController.searchPodcasts);

router.get('/cronjob/count-flush', authorizeAdmin, PodcastController.flushCountDeltas);
router.get(
  '/cronjob/recompute-trending',
  authorizeAdmin,
  PodcastController.recomputeTrendingScoresHandler
);

/**
 * @swagger
 * /podcasts:
 *   post:
 *     summary: Create a new podcast
 *     description: |
 *       Admin only (role=2). Creates a podcast with optional tags.
 *       Client supplies a hosted `podcast_url` — no multipart audio upload.
 *       Tags are looked up by slug (case-insensitive); missing tags are created automatically.
 *     tags: [Podcasts]
 *     security:
 *       - adminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePodcastRequest'
 *     responses:
 *       201:
 *         description: Podcast created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastAdminCreatedResponse'
 *             example:
 *               data:
 *                 id: 42
 *                 title: Episode 12 — Building Better Habits
 *                 description: A deep dive into habit formation and consistency.
 *                 is_premium: true
 *                 podcast_url: https://cdn.kabbik.com/podcasts/ep-12.mp3
 *                 thumb_url: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *                 like_count: 0
 *                 dislike_count: 0
 *                 comment_count: 0
 *                 tags:
 *                   - id: 3
 *                     name: Technology
 *                     slug: technology
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authorizeAdmin, PodcastController.createPodcast);

/**
 * @swagger
 * /podcasts/{id}/similar:
 *   get:
 *     summary: List similar podcasts
 *     description: |
 *       Returns podcasts that share at least one tag with the source podcast, excluding the source itself.
 *       Results are ranked by `shared_tag_count` descending, then `id` descending.
 *
 *       - **Auth:** required.
 *       - **`podcast_url`:** premium-gated (same rules as detail).
 *       - Source podcast with zero tags returns an empty `data` array with `total: 0` (not an error).
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *       - $ref: '#/components/parameters/PodcastPageQuery'
 *       - $ref: '#/components/parameters/PodcastLimitQuery'
 *     responses:
 *       200:
 *         description: Paginated similar podcasts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastSimilarListResponse'
 *             example:
 *               data:
 *                 - id: 55
 *                   title: Episode 19 — Mindful Productivity
 *                   description: Productivity without burnout.
 *                   is_premium: 0
 *                   podcast_url: https://cdn.kabbik.com/podcasts/ep-19.mp3
 *                   thumb_url: https://cdn.kabbik.com/podcasts/ep-19-thumb.jpg
 *                   like_count: 87
 *                   dislike_count: 2
 *                   comment_count: 11
 *                   user_reaction: null
 *                   shared_tag_count: 2
 *               page: 1
 *               limit: 10
 *               total: 6
 *               total_pages: 1
 *       400:
 *         description: Invalid id or query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Source podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/similar', authorize, PodcastController.getSimilarPodcasts);

/**
 * @swagger
 * /podcasts/{id}/like:
 *   post:
 *     summary: Like a podcast
 *     description: |
 *       Records a like for the authenticated user. Idempotent state machine:
 *
 *       | Current state | Result |
 *       |---|---|
 *       | No reaction | Insert like; `like_count + 1` |
 *       | Already liked | **Toggle off** — delete reaction; `like_count - 1`; `user_reaction: null` |
 *       | Disliked | Switch to like; `like_count + 1`, `dislike_count - 1` |
 *
 *       Count updates run inside a DB transaction with row locking to prevent drift under concurrency.
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *     responses:
 *       200:
 *         description: Reaction applied (or toggled off)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastReactionResponse'
 *             examples:
 *               liked:
 *                 summary: Like recorded
 *                 value:
 *                   data:
 *                     like_count: 129
 *                     dislike_count: 4
 *                     user_reaction: like
 *               toggledOff:
 *                 summary: Double-tap toggled off
 *                 value:
 *                   data:
 *                     like_count: 128
 *                     dislike_count: 4
 *                     user_reaction: null
 *       400:
 *         description: Invalid podcast id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/like', authorize, PodcastController.likePodcast);

/**
 * @swagger
 * /podcasts/{id}/dislike:
 *   post:
 *     summary: Dislike a podcast
 *     description: |
 *       Records a dislike for the authenticated user. Mirror of `POST /like`:
 *
 *       | Current state | Result |
 *       |---|---|
 *       | No reaction | Insert dislike; `dislike_count + 1` |
 *       | Already disliked | **Toggle off** — delete reaction; `dislike_count - 1`; `user_reaction: null` |
 *       | Liked | Switch to dislike; `dislike_count + 1`, `like_count - 1` |
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *     responses:
 *       200:
 *         description: Reaction applied (or toggled off)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastReactionResponse'
 *             examples:
 *               disliked:
 *                 summary: Dislike recorded
 *                 value:
 *                   data:
 *                     like_count: 128
 *                     dislike_count: 5
 *                     user_reaction: dislike
 *               toggledOff:
 *                 summary: Double-tap toggled off
 *                 value:
 *                   data:
 *                     like_count: 128
 *                     dislike_count: 4
 *                     user_reaction: null
 *       400:
 *         description: Invalid podcast id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/dislike', authorize, PodcastController.dislikePodcast);

/**
 * @swagger
 * /podcasts/{id}:
 *   patch:
 *     summary: Update a podcast
 *     description: |
 *       Admin only (role=2). Partial update — only fields present in the body are changed.
 *       When `tags` is included, it fully replaces the podcast's tag set.
 *       Omit `tags` to leave existing tags unchanged; pass `"tags": []` to remove all tags.
 *     tags: [Podcasts]
 *     security:
 *       - adminBearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePodcastRequest'
 *     responses:
 *       200:
 *         description: Podcast updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastAdminDetailResponse'
 *       400:
 *         description: Validation error or empty body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authorizeAdmin, PodcastController.updatePodcast);

/**
 * @swagger
 * /podcasts/{id}:
 *   delete:
 *     summary: Delete a podcast
 *     description: |
 *       Admin only (role=2). Hard-deletes the podcast row.
 *       Dependent `podcast_tag` and `podcast_reaction` rows are removed via ON DELETE CASCADE.
 *     tags: [Podcasts]
 *     security:
 *       - adminBearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *     responses:
 *       200:
 *         description: Podcast deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *       400:
 *         description: Invalid podcast id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authorizeAdmin, PodcastController.deletePodcast);

/**
 * @swagger
 * /podcasts/{id}:
 *   get:
 *     summary: Get podcast detail
 *     description: |
 *       Returns full podcast metadata, tags, engagement counts, and the caller's `user_reaction`.
 *
 *       - **Auth:** required.
 *       - **`podcast_url`:** the only endpoint guaranteed to return a playback URL when entitled.
 *         Set to `null` when `is_premium = 1` and the user is not subscribed.
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PodcastIdPath'
 *     responses:
 *       200:
 *         description: Podcast detail with tags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PodcastDetailResponse'
 *             examples:
 *               freePodcast:
 *                 summary: Free podcast — URL included
 *                 value:
 *                   data:
 *                     id: 42
 *                     title: Episode 12 — Building Better Habits
 *                     description: A deep dive into habit formation.
 *                     is_premium: 0
 *                     podcast_url: https://cdn.kabbik.com/podcasts/ep-12.mp3
 *                     thumb_url: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *                     like_count: 128
 *                     dislike_count: 4
 *                     comment_count: 23
 *                     user_reaction: like
 *                     tags:
 *                       - id: 3
 *                         name: Technology
 *                         slug: technology
 *               premiumBlocked:
 *                 summary: Premium + non-subscriber — URL withheld
 *                 value:
 *                   data:
 *                     id: 99
 *                     title: Premium Exclusive Episode
 *                     description: Subscribers only.
 *                     is_premium: 1
 *                     podcast_url: null
 *                     thumb_url: https://cdn.kabbik.com/podcasts/premium-thumb.jpg
 *                     like_count: 50
 *                     dislike_count: 1
 *                     comment_count: 8
 *                     user_reaction: null
 *                     tags: []
 *       400:
 *         description: Invalid podcast id (non-numeric or < 1)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Podcast not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authorize, PodcastController.getPodcast);

module.exports = router;
