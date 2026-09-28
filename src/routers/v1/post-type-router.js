const router = require('express').Router();
const PostTypeController = require('../../controllers/post-type-controller');

/**
 * @swagger
 * tags:
 *   name: PostTypes
 *   description: Community post type lookup for post creation
 */

/**
 * @swagger
 * /post-types:
 *   get:
 *     summary: List active post types
 *     description: Returns post types for the post-creation picker, ordered by sort_order.
 *     tags: [PostTypes]
 *     responses:
 *       200:
 *         description: Active post types
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostTypeListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', PostTypeController.getAll);

module.exports = router;
