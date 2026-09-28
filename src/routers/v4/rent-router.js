const express = require('express');
const RentController = require('../../controllers/rent-controller');
const authorize = require('../../middlewares/auth-middleware');

const router = express.Router();

/**
 * @swagger
 * /rent/active:
 *   get:
 *     summary: Get logged-in user's active rents
 *     description: |
 *       Returns paginated rent rows for the authenticated user where the rent is paid
 *       (`is_purchased = 1`) and has not yet expired (`expired_at > NOW()`),
 *       ordered by soonest expiry first.
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *     responses:
 *       200:
 *         description: Active rents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserRentListResponse'
 *             example:
 *               success: true
 *               data:
 *                 - rent_id: 42
 *                   audiobook_id: 1477
 *                   rented_at: '2025-08-01T10:15:30.000Z'
 *                   expired_at: '2025-10-01T10:15:30.000Z'
 *                   is_purchased: 1
 *                   name: রিচ ড্যাড পুওর ড্যাড
 *                   en_name: Rich Dad Poor Dad
 *                   author_name: Robert Kiyosaki
 *                   en_author_name: Robert Kiyosaki
 *                   thumb_path: /uploads/audiobooks/thumbs/rich-dad-poor-dad.jpg
 *                   banner_path: /uploads/audiobooks/banners/rich-dad-poor-dad.jpg
 *                   rent_duration_in_day: 60
 *                   rent_duration_in_month: 2
 *               meta:
 *                 total: 5
 *                 page: 1
 *                 limit: 20
 *                 total_pages: 1
 *       401:
 *         description: Unauthorized
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
router.get('/active', authorize, RentController.getActiveRents);

/**
 * @swagger
 * /rent/expired:
 *   get:
 *     summary: Get logged-in user's expired rents
 *     description: |
 *       Returns paginated rent rows for the authenticated user where the rent is paid
 *       (`is_purchased = 1`) and has expired (`expired_at <= NOW()`),
 *       ordered by most recently expired first.
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *     responses:
 *       200:
 *         description: Expired rents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserRentListResponse'
 *             example:
 *               success: true
 *               data:
 *                 - rent_id: 18
 *                   audiobook_id: 902
 *                   rented_at: '2025-05-01T08:00:00.000Z'
 *                   expired_at: '2025-07-01T08:00:00.000Z'
 *                   is_purchased: 1
 *                   name: আলোর পাখি
 *                   en_name: Alor Pakhi
 *                   author_name: Humayun Ahmed
 *                   en_author_name: Humayun Ahmed
 *                   thumb_path: /uploads/audiobooks/thumbs/alor-pakhi.jpg
 *                   banner_path: /uploads/audiobooks/banners/alor-pakhi.jpg
 *                   rent_duration_in_day: 60
 *                   rent_duration_in_month: 2
 *               meta:
 *                 total: 3
 *                 page: 1
 *                 limit: 20
 *                 total_pages: 1
 *       401:
 *         description: Unauthorized
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
router.get('/expired', authorize, RentController.getExpiredRents);

/**
 * @swagger
 * tags:
 *   name: Rent
 *   description: Read-only rent catalog endpoints (trending, new releases, search, all rentals)
 */

/**
 * @swagger
 * /rent/trending:
 *   get:
 *     summary: Get trending rent audiobooks
 *     description: |
 *       Returns rent-eligible audiobooks ranked by paid rental count in the last N months.
 *       Only rentals with a non-null `payment_id` are counted.
 *       Invalid `months` values fall back to 4 and are listed in `meta.ignored_filters`.
 *     tags: [Rent]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *       - $ref: '#/components/parameters/RentMonthsQuery'
 *     responses:
 *       200:
 *         description: Trending rentals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RentTrendingResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/trending', RentController.getTrending);

/**
 * @swagger
 * /rent/new-releases:
 *   get:
 *     summary: Get new rent releases
 *     description: |
 *       Returns rent-eligible audiobooks added within the last N months (default 4),
 *       ordered by `created_at` descending. Narrower than `all`, which returns the full catalog.
 *       Invalid `months` values fall back to 4 and are listed in `meta.ignored_filters`.
 *     tags: [Rent]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *       - $ref: '#/components/parameters/RentMonthsQuery'
 *     responses:
 *       200:
 *         description: New releases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RentListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/new-releases', RentController.getNewReleases);

/**
 * @swagger
 * /rent/search:
 *   get:
 *     summary: Search rent-eligible audiobooks
 *     description: |
 *       FULLTEXT boolean-mode prefix search on `name`, `author_name`, and `en_name` for rent-eligible audiobooks only.
 *       Search tokens must be at least 3 characters after sanitization; shorter tokens are dropped.
 *       Results are ranked by relevance descending.
 *     tags: [Rent]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentSearchQuery'
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RentSearchResponse'
 *       400:
 *         description: Missing or invalid search query
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
router.get('/search', RentController.searchRentAudiobooks);

/**
 * @swagger
 * /rent/all:
 *   get:
 *     summary: Get all rent-eligible audiobooks
 *     description: |
 *       Returns all rent-eligible audiobooks ordered by `created_at` descending.
 *       Optional `category_id` and `channel_id` filters are additive; invalid values are ignored
 *       and listed in `meta.ignored_filters`.
 *     tags: [Rent]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Rent
 *     parameters:
 *       - $ref: '#/components/parameters/RentPageQuery'
 *       - $ref: '#/components/parameters/RentLimitQuery'
 *       - $ref: '#/components/parameters/RentCategoryIdQuery'
 *       - $ref: '#/components/parameters/RentChannelIdQuery'
 *     responses:
 *       200:
 *         description: Rentals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RentListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/all', RentController.getAllRentals);

module.exports = router;
