const express = require('express');
const router = express.Router();
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const BannerController = require('../../controllers/banner-controller');

/**
 * @swagger
 * tags:
 *   name: PromotionBanners
 *   description: |
 *     Promotion banner CRUD (v4/banners-router.js). Public reads; admin writes.
 *     For write endpoints, authorize with **adminBearerAuth** (token from `POST /auth/login-admin`
 *     or `POST /auth/dev/bootstrap-admin`). `bearerAuth` also accepted if the JWT has role=2.
 */

/**
 * @swagger
 * /promotionBanners:
 *   get:
 *     summary: List promotion banners
 *     description: Returns non-deleted banners ordered by `created_at` DESC. Optionally filter by `is_active`.
 *     tags: [PromotionBanners]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     parameters:
 *       - $ref: '#/components/parameters/BannerIsActiveQuery'
 *     responses:
 *       200:
 *         description: Banners retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerListResponse'
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   banner_url: https://cdn.kabbik.com/banners/promo-summer.jpg
 *                   goto_page: /audiobooks/123
 *                   is_active: 1
 *                   payload:
 *                     campaign_id: summer-2026
 *                     cta_label: Listen now
 *                   target_audience: premium
 *                   created_at: '2026-09-21T10:00:00.000Z'
 *                   updated_at: '2026-09-21T10:00:00.000Z'
 *                   deleted_at: null
 *               message: Banners retrieved
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', BannerController.getAll);

/**
 * @swagger
 * /promotionBanners/{id}/toggle:
 *   patch:
 *     summary: Toggle banner active status
 *     description: Flips `is_active` (`1` ↔ `0`). Admin only (`role=2`).
 *     tags: [PromotionBanners]
 *     security:
 *       - adminBearerAuth: []
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     parameters:
 *       - $ref: '#/components/parameters/BannerIdPath'
 *     responses:
 *       200:
 *         description: Banner toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 banner_url: https://cdn.kabbik.com/banners/promo-summer.jpg
 *                 goto_page: /audiobooks/123
 *                 is_active: 0
 *                 payload:
 *                   campaign_id: summer-2026
 *                 target_audience: premium
 *                 created_at: '2026-09-21T10:00:00.000Z'
 *                 updated_at: '2026-09-21T12:00:00.000Z'
 *                 deleted_at: null
 *               message: Banner toggled
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Banner not found
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
router.patch('/:id/toggle', authorizeAdmin, BannerController.toggle);

/**
 * @swagger
 * /promotionBanners/{id}:
 *   get:
 *     summary: Get a promotion banner by id
 *     tags: [PromotionBanners]
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     parameters:
 *       - $ref: '#/components/parameters/BannerIdPath'
 *     responses:
 *       200:
 *         description: Banner retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 banner_url: https://cdn.kabbik.com/banners/promo-summer.jpg
 *                 goto_page: /audiobooks/123
 *                 is_active: 1
 *                 payload:
 *                   campaign_id: summer-2026
 *                   cta_label: Listen now
 *                 target_audience: premium
 *                 created_at: '2026-09-21T10:00:00.000Z'
 *                 updated_at: '2026-09-21T10:00:00.000Z'
 *                 deleted_at: null
 *               message: Banner retrieved
 *       404:
 *         description: Banner not found
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
 *   patch:
 *     summary: Update a promotion banner
 *     description: |
 *       Partial update — send any subset of `banner_url`, `goto_page`, `is_active`, `payload`, `target_audience`. Admin only.
 *       `payload` is stored as JSON; pass an object or `null` to clear.
 *     tags: [PromotionBanners]
 *     security:
 *       - adminBearerAuth: []
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     parameters:
 *       - $ref: '#/components/parameters/BannerIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePromotionBannerRequest'
 *           example:
 *             goto_page: /audiobooks/456
 *             target_audience: free
 *             payload:
 *               campaign_id: summer-2026
 *               cta_label: Start listening
 *     responses:
 *       200:
 *         description: Banner updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerResponse'
 *       400:
 *         description: No fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: No fields to update
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Banner not found
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
 *   delete:
 *     summary: Soft delete a promotion banner
 *     description: Sets `deleted_at = NOW()`. Admin only.
 *     tags: [PromotionBanners]
 *     security:
 *       - adminBearerAuth: []
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     parameters:
 *       - $ref: '#/components/parameters/BannerIdPath'
 *     responses:
 *       200:
 *         description: Banner deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerDeleteResponse'
 *             example:
 *               success: true
 *               message: Banner deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Banner not found or already deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Banner not found or already deleted
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', BannerController.getOne);
router.patch('/:id', authorizeAdmin, BannerController.update);
router.delete('/:id', authorizeAdmin, BannerController.remove);

/**
 * @swagger
 * /promotionBanners:
 *   post:
 *     summary: Create a promotion banner
 *     description: |
 *       Admin only (`role=2`). `is_active` defaults to `1` when omitted.
 *       `payload` is optional JSON; defaults to `null` when omitted.
 *       `target_audience` is optional; defaults to `all`. Must be `all`, `free`, or `premium`.
 *     tags: [PromotionBanners]
 *     security:
 *       - adminBearerAuth: []
 *       - bearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Promotion Banners
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePromotionBannerRequest'
 *           example:
 *             banner_url: https://cdn.kabbik.com/banners/promo-new.jpg
 *             goto_page: /home
 *             is_active: 1
 *             target_audience: all
 *             payload:
 *               campaign_id: summer-2026
 *               cta_label: Listen now
 *     responses:
 *       201:
 *         description: Banner created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PromotionBannerResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: 2
 *                 banner_url: https://cdn.kabbik.com/banners/promo-new.jpg
 *                 goto_page: /home
 *                 is_active: 1
 *                 target_audience: all
 *                 payload:
 *                   campaign_id: summer-2026
 *                   cta_label: Listen now
 *                 created_at: '2026-09-21T12:00:00.000Z'
 *                 updated_at: '2026-09-21T12:00:00.000Z'
 *                 deleted_at: null
 *               message: Banner created
 *       400:
 *         description: Missing required fields
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authorizeAdmin, BannerController.create);

module.exports = router;
