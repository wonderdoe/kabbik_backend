/**
 * @swagger
 * tags:
 *   - name: V4 Subs Page Track Router
 *     description: V4 Subs Page Track Router endpoints (v4/subs_page_track_router.js)
 */

/**
 * @swagger
 * /subs-page-track/create:
 *   post:
 *     summary: POST create
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V4 Subs Page Track Router]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *             example:
 *               success: true
 *               data: {}
 *       400:
 *         description: Bad request
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
