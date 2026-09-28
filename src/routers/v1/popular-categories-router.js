const router = require('express').Router();
const DiscoveryController = require('../../controllers/discovery-controller');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category discovery and popularity rankings
 */

/**
 * @swagger
 * /categories/popular:
 *   get:
 *     summary: Get popular categories by listener count
 *     description: |
 *       Returns categories ranked by the number of distinct users who have listened
 *       to at least one audiobook in that category.
 *     tags: [Categories]
 *     parameters:
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: Popular categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PopularCategoriesResponse'
 *       400:
 *         description: Invalid limit parameter
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
router.get('/popular', DiscoveryController.getPopularCategories);

module.exports = router;
