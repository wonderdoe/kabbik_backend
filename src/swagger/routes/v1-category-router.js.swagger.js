/**
 * @swagger
 * tags:
 *   - name: V1 Category
 *     description: V1 Category endpoints (v1/category-router.js)
 */

/**
 * @swagger
 * /categories/:
 *   get:
 *     summary: GET root
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /categories/admin:
 *   get:
 *     summary: GET admin
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /api/v1/categories/admin/bulk-upload:
 *   post:
 *     summary: Bulk remap categories from JSON (admin)
 *     description: |
 *       POST a JSON array of `{ category_name, audiobook_ids }` objects (or `{ categories: [...] }`).
 *       Defaults to `dryRun=true` (plan only, no writes). Set `dryRun=false` to commit.
 *       Commit is blocked when parse/unmatched/ambiguous rows exist unless `force=true`.
 *     tags: [V1 Category]
 *     security:
 *       - adminBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dryRun
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *           default: false
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: array
 *                 items:
 *                   type: object
 *                   required: [category_name, audiobook_ids]
 *                   properties:
 *                     category_name:
 *                       type: string
 *                     audiobook_ids:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     count:
 *                       type: integer
 *               - type: object
 *                 required: [categories]
 *                 properties:
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [category_name, audiobook_ids]
 *                       properties:
 *                         category_name:
 *                           type: string
 *                         audiobook_ids:
 *                           type: array
 *                           items:
 *                             type: integer
 *     responses:
 *       200:
 *         description: Dry-run plan or committed migration summary
 *       400:
 *         description: Invalid JSON body
 *       401:
 *         description: Unauthorized (admin only)
 *       409:
 *         description: Unresolved rows block commit
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/add/with-image:
 *   post:
 *     summary: POST add/with-image
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /categories/add/with-out-image:
 *   post:
 *     summary: POST add/with-out-image
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /categories/update/with-image:
 *   put:
 *     summary: PUT update/with-image
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /categories/update/with-out-image:
 *   put:
 *     summary: PUT update/with-out-image
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 Category]
 *     security:
 *       - bearerAuth: []
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
