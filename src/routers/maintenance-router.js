const express = require('express');
const router = express.Router();
const { getMaintenanceStatus } = require('../controllers/maintenance-controller');

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Public app and website maintenance status (no auth)
 */

/**
 * @swagger
 * /api/maintenance-status:
 *   get:
 *     summary: Get maintenance status for app and/or website
 *     description: |
 *       Public endpoint — no authentication. Call before login; auth may be unavailable during maintenance.
 *
 *       - Omit `platform` to receive both `app` and `website` keyed objects plus `serverTime`.
 *       - Set `platform=app` or `platform=website` for a flat single-platform body plus `serverTime`.
 *       - `isUnderMaintenance` is true only when the DB flag is on and the current UTC time falls inside
 *         optional `startsAt` / `endsAt` (null bounds mean open-ended).
 *       - Database errors fail open with HTTP 200 and `isUnderMaintenance` false.
 *       - Response includes `Cache-Control: public, max-age=15`.
 *     tags: [Maintenance]
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [app, website]
 *         required: false
 *         description: Filter to one platform; omit for both
 *     responses:
 *       200:
 *         description: Maintenance status
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MaintenanceStatusBothResponse'
 *                 - $ref: '#/components/schemas/MaintenanceStatusSingleResponse'
 *             examples:
 *               bothPlatforms:
 *                 summary: No platform query (default)
 *                 value:
 *                   app:
 *                     platform: app
 *                     isUnderMaintenance: false
 *                     title:
 *                       en: Under Maintenance
 *                       bn: রক্ষণাবেক্ষণ চলছে
 *                     message:
 *                       en: We will be back shortly.
 *                       bn: আমরা শীঘ্রই ফিরে আসব।
 *                     startsAt: null
 *                     endsAt: null
 *                   website:
 *                     platform: website
 *                     isUnderMaintenance: false
 *                     title:
 *                       en: Under Maintenance
 *                       bn: রক্ষণাবেক্ষণ চলছে
 *                     message:
 *                       en: We will be back shortly.
 *                       bn: আমরা শীঘ্রই ফিরে আসব।
 *                     startsAt: null
 *                     endsAt: null
 *                   serverTime: '2026-10-03T13:30:00.000Z'
 *               singlePlatform:
 *                 summary: platform=app
 *                 value:
 *                   platform: app
 *                   isUnderMaintenance: false
 *                   title:
 *                     en: Under Maintenance
 *                     bn: রক্ষণাবেক্ষণ চলছে
 *                   message:
 *                     en: We will be back shortly.
 *                     bn: আমরা শীঘ্রই ফিরে আসব।
 *                   startsAt: null
 *                   endsAt: null
 *                   serverTime: '2026-10-03T13:30:00.000Z'
 *       400:
 *         description: Invalid platform query value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceErrorResponse'
 *             example:
 *               error: platform must be app or website
 *       404:
 *         description: Platform row missing (single-platform request only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceErrorResponse'
 *             example:
 *               error: platform not found
 */
router.get('/maintenance-status', getMaintenanceStatus);

module.exports = router;
