const router = require('express').Router();
const cron = require('node-cron');
const PostController = require('../../controllers/post-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeOptional = require('../../middlewares/auth-optional-middleware');
const LoggerError = require('../../utils/logger-error');

const runTrendingSafely = (fn) => {
  void fn().catch((err) => {
    console.error('[post-cron:trending] unhandled rejection:', err);
    LoggerError.log(err);
  });
};

if (process.env.POST_TRENDING_RECOMPUTE_ENABLED !== 'false') {
  const trendingCronSchedule = process.env.POST_TRENDING_RECOMPUTE_CRON || '*/15 * * * *';
  cron.schedule(trendingCronSchedule, () => {
    runTrendingSafely(() => PostController.runScheduledTrendingRecompute());
  });
}

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Community post endpoints — create, like, comment, and share posts
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new community post
 *     description: Authenticated users can create a post with optional text content and an optional linked audiobook.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostRequest'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       400:
 *         description: Validation error
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
 *       422:
 *         description: Business rule violation (e.g. audiobook_id required for audiobook_review, title required for discussion)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Audiobook not found (when audiobook_id is provided)
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
router.post('/', authorize, PostController.create);

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: List all community posts
 *     description: |
 *       Returns a paginated list of posts. Public endpoint.
 *       Default sort is `recent` (created_at descending). Use `sort=trending` for hot-ranked posts.
 *       Pass an optional Bearer token to include liked_by_me for the current user.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - $ref: '#/components/parameters/PostTypeQuery'
 *       - $ref: '#/components/parameters/SortQuery'
 *     responses:
 *       200:
 *         description: Paginated list of posts with author, audiobook, and counter stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       400:
 *         description: Invalid query parameter (e.g. unknown post_type or sort value)
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
router.get('/',authorizeOptional, PostController.getAll);

router.get('/cronjob/recompute-trending', authorizeAdmin, PostController.recomputeTrendingScoresHandler);

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: List posts by a specific user
 *     description: |
 *       Returns a paginated list of posts created by the given user ID. Public endpoint.
 *       Pass an optional Bearer token to include liked_by_me for the current user.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - $ref: '#/components/parameters/PostTypeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of user posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/:userId', authorizeOptional, PostController.getByUserId);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a single post by ID
 *     description: |
 *       Returns full post detail including author and audiobook.
 *       Pass a Bearer token to get `is_liked_by_me` for the current user.
 *       Without a token, `is_liked_by_me` is always false.
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     responses:
 *       200:
 *         description: Post detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Post not found
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
router.get('/:id', authorizeOptional, PostController.getById);

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Soft delete own post
 *     description: Sets `deleted = 1` on the post. Only the post owner can delete. Returns 403 if not the owner.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     responses:
 *       200:
 *         description: Post soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *             example:
 *               success: true
 *               message: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the post owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Forbidden
 *       404:
 *         description: Post not found
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
router.delete('/:id', authorize, PostController.delete);

/**
 * @swagger
 * /posts/{id}:
 *   patch:
 *     summary: Update spoiler flag and/or title on own post
 *     description: |
 *       Allows the post owner to update `is_spoiler` and/or `title` after creation.
 *       At least one field must be provided. `post_type_id` and `audiobook_id` are immutable.
 *       `title` must be non-empty when the post is a discussion.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostRequest'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       400:
 *         description: Validation error or immutable field sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the post owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
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
router.patch('/:id', authorize, PostController.update);

/**
 * @swagger
 * /posts/{id}/like:
 *   post:
 *     summary: Like a post
 *     description: |
 *       Idempotent — if already liked, returns current state without error.
 *       If `like_type` changes on an existing like, updates the type without incrementing the counter again.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LikePostRequest'
 *     responses:
 *       200:
 *         description: Like recorded or updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LikePostResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
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
router.post('/:id/like', authorize, PostController.like);

/**
 * @swagger
 * /posts/{id}/like:
 *   delete:
 *     summary: Remove own like from a post
 *     description: Deletes the like row and decrements `like_count`. Safe to call if not liked — returns current count.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     responses:
 *       200:
 *         description: Like removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnlikePostResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
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
router.delete('/:id/like', authorize, PostController.unlike);

/**
 * @swagger
 * /posts/{id}/likes:
 *   get:
 *     summary: List users who liked a post
 *     description: Paginated list of users who liked the post, with like_type and timestamp. Public endpoint.
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of likes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostLikesListResponse'
 *       404:
 *         description: Post not found
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
router.get('/:id/likes', PostController.getLikes);

/**
 * @swagger
 * /posts/{id}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     description: |
 *       Creates a top-level comment or a reply when `parent_comment_id` is provided.
 *       Parent comment must belong to the same post.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCommentResponse'
 *       400:
 *         description: Validation error or invalid parent comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
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
router.post('/:id/comments', authorize, PostController.addComment);

/**
 * @swagger
 * /posts/{id}/comments:
 *   get:
 *     summary: List comments on a post (threaded)
 *     description: |
 *       Returns top-level comments paginated, each with a nested `replies` array.
 *       Pagination applies to top-level comments only.
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated threaded comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentsListResponse'
 *       404:
 *         description: Post not found
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
router.get('/:id/comments', PostController.getComments);

/**
 * @swagger
 * /posts/comments/{commentId}:
 *   patch:
 *     summary: Edit own comment
 *     description: Updates comment text. Only the comment author can edit. Comment must not be deleted.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentRequest'
 *     responses:
 *       200:
 *         description: Comment updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *             example:
 *               success: true
 *               message: Comment updated successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the comment owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comment not found
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
router.patch('/comments/:commentId', authorize, PostController.updateComment);

/**
 * @swagger
 * /posts/comments/{commentId}:
 *   delete:
 *     summary: Soft delete own comment
 *     description: Sets `deleted = 1` on the comment and decrements the post's `comment_count`. Only the comment author can delete.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentIdPath'
 *     responses:
 *       200:
 *         description: Comment soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *             example:
 *               success: true
 *               message: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the comment owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comment not found
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
router.delete('/comments/:commentId', authorize, PostController.deleteComment);

/**
 * @swagger
 * /posts/{id}/share:
 *   post:
 *     summary: Record a share event
 *     description: Inserts a share record and increments the post's `share_count`. Requires authentication.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SharePostRequest'
 *     responses:
 *       200:
 *         description: Share recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SharePostResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
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
router.post('/:id/share', authorize, PostController.share);

/**
 * @swagger
 * /posts/{id}/shares/count:
 *   get:
 *     summary: Get current share count
 *     description: Returns the denormalized `share_count` for a post. Useful for cache-bypass debugging. Public endpoint.
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PostIdPath'
 *     responses:
 *       200:
 *         description: Current share count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShareCountResponse'
 *       404:
 *         description: Post not found
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
router.get('/:id/shares/count', PostController.getShareCount);

module.exports = router;
