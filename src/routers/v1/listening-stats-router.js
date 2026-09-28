const router = require('express').Router();
const DiscoveryController = require('../../controllers/discovery-controller');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: ListeningStats
 *   description: Authenticated user listening statistics and currently-in-progress books
 */

/**
 * @swagger
 * /users/me/listening-stats:
 *   get:
 *     summary: Get current user's listening stats
 *     description: |
 *       Returns aggregated listening statistics for the authenticated user:
 *       total listened hours, completed book counts, and in-progress books.
 *     tags: [ListeningStats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listening stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListeningStatsResponse'
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
router.get('/listening-stats', authorize, DiscoveryController.getListeningStats);

module.exports = router;
