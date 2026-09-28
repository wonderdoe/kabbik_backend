/**
 * @swagger
 * tags:
 *   - name: V1 Author
 *     description: V1 Author endpoints (v1/Author-router.js)
 */

/**
 * @swagger
 * /authors/get-authors:
 *   get:
 *     summary: GET get-authors
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Author]
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
