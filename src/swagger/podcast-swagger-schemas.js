/**
 * @swagger
 * components:
 *   parameters:
 *     PodcastIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Podcast ID
 *       example: 42
 *     PodcastPageQuery:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number (1-based). Non-numeric or negative values clamp to 1.
 *     PodcastLimitQuery:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 50
 *         default: 10
 *       description: Items per page (1–50). Non-numeric or out-of-range values are clamped server-side.
 *     PodcastTagSlugQuery:
 *       in: query
 *       name: tag
 *       schema:
 *         type: string
 *         maxLength: 255
 *       description: Optional filter by tag slug (exact match on `tag.slug`). Omit to return all podcasts.
 *       example: technology
 *     PodcastSortQuery:
 *       in: query
 *       name: sort
 *       schema:
 *         type: string
 *         enum: [recent, trending]
 *         default: recent
 *       description: |
 *         Sort order for list results. `recent` orders by `id` descending (default).
 *         `trending` orders by precomputed `trending_score` descending, then `id` descending.
 *       example: trending
 *     PodcastSearchQuery:
 *       in: query
 *       name: q
 *       required: true
 *       schema:
 *         type: string
 *         maxLength: 200
 *       description: |
 *         Search term (FULLTEXT boolean mode on `title` and `description`).
 *         Input is sanitized: boolean-mode special characters are stripped and each
 *         token (min 3 chars) is turned into a prefix match (e.g. `podcast` → `podcast*`).
 *       example: habits
 *
 *   schemas:
 *     PodcastUserReaction:
 *       type: string
 *       nullable: true
 *       enum: [like, dislike]
 *       description: |
 *         Current user's reaction to this podcast.
 *         `null` means no reaction, or the caller is unauthenticated (list only).
 *       example: like
 *
 *     PodcastTag:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 3
 *         name:
 *           type: string
 *           example: Technology
 *         slug:
 *           type: string
 *           example: technology
 *
 *     PodcastListItem:
 *       type: object
 *       description: |
 *         Podcast summary for list views. `podcast_url` is always `null` on the list endpoint
 *         regardless of `is_premium` or subscription status — use GET /podcasts/{id} for playback URL.
 *       properties:
 *         id:
 *           type: integer
 *           example: 42
 *         title:
 *           type: string
 *           example: Episode 12 — Building Better Habits
 *         description:
 *           type: string
 *           nullable: true
 *           example: A deep dive into habit formation and consistency.
 *         is_premium:
 *           type: integer
 *           description: 1 = premium content, 0 = free
 *           example: 1
 *         podcast_url:
 *           type: string
 *           nullable: true
 *           description: Always null on list responses.
 *           example: null
 *         thumb_url:
 *           type: string
 *           format: uri
 *           description: |
 *             Thumbnail URL. Always populated on every endpoint regardless of premium status
 *             (unlike `podcast_url`, which is null in list/search and premium-gated in detail).
 *           example: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *         like_count:
 *           type: integer
 *           description: Denormalized like counter on the podcast row
 *           example: 128
 *         dislike_count:
 *           type: integer
 *           example: 4
 *         comment_count:
 *           type: integer
 *           example: 23
 *         view_count:
 *           type: integer
 *           description: Denormalized view counter on the podcast row
 *           example: 1042
 *         user_reaction:
 *           $ref: '#/components/schemas/PodcastUserReaction'
 *
 *     PodcastDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/PodcastListItem'
 *         - type: object
 *           properties:
 *             podcast_url:
 *               type: string
 *               nullable: true
 *               description: |
 *                 Playback URL. Populated when the podcast is free, or when the user is subscribed.
 *                 `null` when `is_premium = 1` and the authenticated user is not subscribed.
 *               example: https://cdn.kabbik.com/podcasts/ep-12.mp3
 *             tags:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PodcastTag'
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Row creation timestamp (UTC ISO-8601)
 *               example: '2026-08-25T10:30:00.000Z'
 *             updated_at:
 *               type: string
 *               format: date-time
 *               description: Last update timestamp (UTC ISO-8601)
 *               example: '2026-08-25T12:00:00.000Z'
 *
 *     PodcastSimilarItem:
 *       allOf:
 *         - $ref: '#/components/schemas/PodcastListItem'
 *         - type: object
 *           properties:
 *             shared_tag_count:
 *               type: integer
 *               description: Number of tags shared with the source podcast
 *               example: 2
 *             podcast_url:
 *               type: string
 *               nullable: true
 *               description: Premium-gated playback URL (same rules as detail).
 *
 *     PodcastPaginatedEnvelope:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PodcastListItem'
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 42
 *         total_pages:
 *           type: integer
 *           example: 5
 *
 *     PodcastListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/PodcastPaginatedEnvelope'
 *         - type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PodcastListItem'
 *
 *     PodcastSimilarListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/PodcastPaginatedEnvelope'
 *         - type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PodcastSimilarItem'
 *
 *     PodcastDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/PodcastDetail'
 *
 *     PodcastReactionMutationResult:
 *       type: object
 *       properties:
 *         like_count:
 *           type: integer
 *           example: 129
 *         dislike_count:
 *           type: integer
 *           example: 4
 *         user_reaction:
 *           $ref: '#/components/schemas/PodcastUserReaction'
 *
 *     PodcastReactionResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/PodcastReactionMutationResult'
 *
 *     CreatePodcastRequest:
 *       type: object
 *       required: [title, podcast_url, thumb_url]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *           example: The Future of Audio
 *         description:
 *           type: string
 *           nullable: true
 *           example: A deep dive into podcasting trends.
 *         is_premium:
 *           type: boolean
 *           default: false
 *           example: false
 *         podcast_url:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/podcasts/ep12.mp3
 *         thumb_url:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/podcasts/ep12-thumb.jpg
 *         tags:
 *           type: array
 *           maxItems: 20
 *           items:
 *             type: string
 *           example: [comedy, tech]
 *
 *     UpdatePodcastRequest:
 *       type: object
 *       description: Partial update — at least one field required.
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *           example: Updated title
 *         description:
 *           type: string
 *           nullable: true
 *           example: Updated description
 *         is_premium:
 *           type: boolean
 *           example: true
 *         podcast_url:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/podcasts/ep12-v2.mp3
 *         thumb_url:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/podcasts/ep12-v2-thumb.jpg
 *         tags:
 *           type: array
 *           maxItems: 20
 *           items:
 *             type: string
 *           description: Full tag replacement when present; pass [] to remove all tags.
 *           example: [comedy, news]
 *
 *     PodcastAdminDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/PodcastDetail'
 *
 *     PodcastAdminCreatedDetail:
 *       type: object
 *       description: |
 *         Freshly created podcast returned by POST /podcasts.
 *         Engagement counters are always 0 on a new row.
 *       properties:
 *         id:
 *           type: integer
 *           example: 42
 *         title:
 *           type: string
 *           example: Episode 12 — Building Better Habits
 *         description:
 *           type: string
 *           nullable: true
 *           example: A deep dive into habit formation and consistency.
 *         is_premium:
 *           type: boolean
 *           example: true
 *         podcast_url:
 *           type: string
 *           example: https://cdn.kabbik.com/podcasts/ep-12.mp3
 *         thumb_url:
 *           type: string
 *           example: https://cdn.kabbik.com/podcasts/ep-12-thumb.jpg
 *         like_count:
 *           type: integer
 *           example: 0
 *         dislike_count:
 *           type: integer
 *           example: 0
 *         comment_count:
 *           type: integer
 *           example: 0
 *         view_count:
 *           type: integer
 *           example: 0
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PodcastTag'
 *
 *     PodcastAdminCreatedResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/PodcastAdminCreatedDetail'
 */

module.exports = {};
