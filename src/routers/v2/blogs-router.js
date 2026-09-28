const router = require('express').Router();
const BlogsController = require('../../controllers/blogs-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeOptional = require('../../middlewares/auth-optional-middleware');

/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: Blog engagement endpoints — like, dislike, comment, share, and list
 */

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: List blogs with engagement stats
 *     description: |
 *       Returns a paginated blog list following the v1 blog list conventions.
 *       Supports approved/pending filters, optional userId filter, and offset/limit pagination.
 *       Pass an optional Bearer token to include liked_by_me and like_type for the current user.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pending, approved]
 *         description: Filter blogs by approval status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter blogs by author user ID
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Pagination offset
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Pagination limit
 *     responses:
 *       200:
 *         description: Blog list with engagement counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authorizeOptional, BlogsController.getAll);

/**
 * @swagger
 * /blogs/comments/{commentId}:
 *   patch:
 *     summary: Edit own comment
 *     description: Updates comment text. Only the comment author can edit. Comment must not be deleted.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
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
router.patch('/comments/:commentId', authorize, BlogsController.updateComment);

/**
 * @swagger
 * /blogs/comments/{commentId}:
 *   delete:
 *     summary: Soft delete own comment
 *     description: Sets deleted = 1 on the comment. Only the comment author can delete.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
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
router.delete('/comments/:commentId', authorize, BlogsController.deleteComment);

/**
 * @swagger
 * /blogs/{id}/reactions:
 *   get:
 *     summary: List users who liked or disliked a blog
 *     description: Paginated list of reactions with user info. Filter by type using ?type=like or ?type=dislike. Public endpoint.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *       - $ref: '#/components/parameters/ReactionTypeQuery'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of reactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogReactionsListResponse'
 *       400:
 *         description: Invalid type filter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Blog not found
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
router.get('/:id/reactions', BlogsController.getReactions);

/**
 * @swagger
 * /blogs/{id}/reaction:
 *   delete:
 *     summary: Remove own reaction from a blog
 *     description: Deletes the reaction row entirely (neither liked nor disliked). Safe to call if no reaction exists.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *     responses:
 *       200:
 *         description: Reaction removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReactionMutationResponse'
 *             example:
 *               data:
 *                 reaction_type: null
 *                 likeCount: 12
 *                 dislikeCount: 1
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Blog not found
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
router.delete('/:id/reaction', authorize, BlogsController.removeReaction);

/**
 * @swagger
 * /blogs/{id}/like:
 *   post:
 *     summary: Like a blog
 *     description: |
 *       Sets reaction_type = 1 for the current user.
 *       Idempotent — if already liked, returns current state without error.
 *       If previously disliked, switches to like.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *     responses:
 *       200:
 *         description: Like recorded or updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReactionMutationResponse'
 *             example:
 *               data:
 *                 reaction_type: 1
 *                 likeCount: 12
 *                 dislikeCount: 1
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Blog not found
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
router.post('/:id/like', authorize, BlogsController.like);

/**
 * @swagger
 * /blogs/{id}/dislike:
 *   post:
 *     summary: Dislike a blog
 *     description: |
 *       Sets reaction_type = 2 for the current user.
 *       Idempotent — if already disliked, returns current state without error.
 *       If previously liked, switches to dislike.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *     responses:
 *       200:
 *         description: Dislike recorded or updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReactionMutationResponse'
 *             example:
 *               data:
 *                 reaction_type: 2
 *                 likeCount: 11
 *                 dislikeCount: 2
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Blog not found
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
router.post('/:id/dislike', authorize, BlogsController.dislike);

/**
 * @swagger
 * /blogs/{id}/comments:
 *   post:
 *     summary: Add a comment to a blog
 *     description: Creates a new comment on the blog. Requires authentication.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
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
 *       404:
 *         description: Blog not found
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
router.post('/:id/comments', authorize, BlogsController.addComment);

/**
 * @swagger
 * /blogs/{id}/comments:
 *   get:
 *     summary: List comments on a blog
 *     description: Returns a paginated flat list of comments, most recent first, with commenter user info. Public endpoint.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogCommentsListResponse'
 *       404:
 *         description: Blog not found
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
router.get('/:id/comments', BlogsController.getComments);

/**
 * @swagger
 * /blogs/{id}/share:
 *   post:
 *     summary: Record a share event
 *     description: Inserts a share record. Share count is computed live from blog_stats view. Requires authentication.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShareBlogRequest'
 *     responses:
 *       200:
 *         description: Share recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShareBlogResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Blog not found
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
router.post('/:id/share', authorize, BlogsController.share);

/**
 * @swagger
 * /blogs/{id}:
 *   get:
 *     summary: Get full blog detail with engagement stats
 *     description: |
 *       Returns blog fields plus likeCount, dislikeCount, commentCount, shareCount from blog_stats view.
 *       Pass a Bearer token to get myReaction (1=like, 2=dislike, null=no reaction) for the current user.
 *       Returns 404 if blog is deleted or not approved.
 *     tags: [Blogs]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Blog Engagement
 *     parameters:
 *       - $ref: '#/components/parameters/BlogIdPath'
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     responses:
 *       200:
 *         description: Blog detail with stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogDetailResponse'
 *       404:
 *         description: Blog not found or not approved
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
router.get('/:id', authorizeOptional, BlogsController.getById);

module.exports = router;
