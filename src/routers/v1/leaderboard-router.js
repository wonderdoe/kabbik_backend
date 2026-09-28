const router = require('express').Router();
const DiscoveryController = require('../../controllers/discovery-controller');

/**
 * @swagger
 * tags:
 *   name: Leaderboard
 *   description: Monthly listening leaderboards for subscribed contributors
 */

/**
 * @swagger
 * /leaderboard/top-contributors:
 *   get:
 *     summary: Get top 3 subscribed contributors by listening hours
 *     description: |
 *       Returns up to 3 subscribed users ranked by listening hours for the given calendar month.
 *       Only users with `is_subscribed = 1` are included. Returns fewer than 3 if not enough qualify.
 *     tags: [Leaderboard]
 *     parameters:
 *       - $ref: '#/components/parameters/MonthQuery'
 *     responses:
 *       200:
 *         description: Top contributors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopContributorsResponse'
 *       400:
 *         description: Invalid month format
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
router.get('/top-contributors', DiscoveryController.getTopContributors);

module.exports = router;
