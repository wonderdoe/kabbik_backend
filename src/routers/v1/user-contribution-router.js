const router = require('express').Router();
const UserContributionController = require('../../controllers/user-contribution-controller');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: UserContributions
 *   description: Authenticated user's community post activity — authored, liked, and commented posts
 */

/**
 * @swagger
 * /users/me/posts:
 *   get:
 *     summary: List posts authored by the current user
 *     description: |
 *       Returns a paginated list of community posts created by the authenticated user,
 *       ordered by created_at descending. User ID is always resolved from the JWT.
 *     tags: [UserContributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - $ref: '#/components/parameters/PostTypeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of the current user's authored posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       401:
 *         description: Missing or invalid JWT token
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
router.get('/posts', authorize, UserContributionController.getMyPosts);

/**
 * @swagger
 * /users/me/liked-posts:
 *   get:
 *     summary: List posts liked by the current user
 *     description: |
 *       Returns a paginated list of community posts the authenticated user has liked,
 *       ordered by when the like was created (most recent first). User ID is always
 *       resolved from the JWT.
 *     tags: [UserContributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of posts liked by the current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       401:
 *         description: Missing or invalid JWT token
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
router.get('/liked-posts', authorize, UserContributionController.getLikedPosts);

/**
 * @swagger
 * /users/me/commented-posts:
 *   get:
 *     summary: List posts the current user has commented on
 *     description: |
 *       Returns a paginated list of distinct community posts the authenticated user has
 *       commented on at least once, ordered by the most recent comment timestamp (not the
 *       post's created_at). User ID is always resolved from the JWT.
 *     tags: [UserContributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of posts commented on by the current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       401:
 *         description: Missing or invalid JWT token
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
router.get('/commented-posts', authorize, UserContributionController.getCommentedPosts);

module.exports = router;
