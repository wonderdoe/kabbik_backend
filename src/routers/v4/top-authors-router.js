const router = require('express').Router();
const DiscoveryController = require('../../controllers/discovery-controller');

/**
 * @swagger
 * tags:
 *   name: Authors
 *   description: Author discovery and rankings
 */

/**
 * @swagger
 * /authors/top:
 *   get:
 *     summary: Get top authors by play count
 *     description: |
 *       Returns authors dynamically ranked by aggregated play count across their audiobooks.
 *       Audiobooks are matched to authors via exact `author_name = authors.name` string match.
 *       Only active, non-deleted authors with at least one approved audiobook are included.
 *     tags: [Authors]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Authors
 *     parameters:
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: Top authors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopAuthorsResponse'
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
router.get('/top', DiscoveryController.getTopAuthors);

module.exports = router;
