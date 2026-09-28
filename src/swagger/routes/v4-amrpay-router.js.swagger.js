/**
 * @swagger
 * tags:
 *   - name: V4 Amrpay
 *     description: V4 Amrpay endpoints (v4/amrpay-router.js)
 */

/**
 * @swagger
 * /amrpay/create-payment-amrpay:
 *   post:
 *     summary: POST create-payment-amrpay
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V4 Amrpay]
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
