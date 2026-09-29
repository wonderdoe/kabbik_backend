/**
 * @swagger
 * tags:
 *   - name: V1 User
 *     description: V1 User endpoints (v1/user-router.js)
 */

/**
 * @swagger
 * /users/user-purchase:
 *   get:
 *     summary: GET user-purchase
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
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
 * /users/get-by-ids:
 *   get:
 *     summary: GET get-by-ids
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
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
 * /users/audiobook-download-limit:
 *   get:
 *     summary: Download limit and usage for the logged-in user
 *     description: |
 *       User comes from the Bearer token (no `user_id` query param).
 *       Caps from `homepage_data` (`track_key=episode_limit`, `status=1`).
 *       Count is `COUNT(*)` of `audiobook_download_log` in the current 30-day bucket from `users.purchase_time`.
 *       Window start is `purchase_time + floor(daysSincePurchase / 30) * 30 days`. Window end is start + 30 days.
 *       Rows are counted when `created_at >= start AND created_at < end`.
 *       If `purchase_time` is missing, the count is all-time and both window fields are null.
 *       `limit` and `remaining_count` follow `users.is_subscribed` (premium caps when `1`, otherwise free caps).
 *       Remaining values are never below 0.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Caps and usage for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 1201
 *                     free_limit:
 *                       type: integer
 *                       example: 1
 *                     premium_limit:
 *                       type: integer
 *                       example: 50
 *                     downloaded_count:
 *                       type: integer
 *                       example: 0
 *                     remaining_free_count:
 *                       type: integer
 *                       example: 1
 *                     remaining_premium_count:
 *                       type: integer
 *                       example: 50
 *                     window_start:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2026-09-01T00:00:00.000Z"
 *                     window_end:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2026-10-01T00:00:00.000Z"
 *                     limit:
 *                       type: integer
 *                       description: Cap for this user's tier (`is_subscribed`).
 *                       example: 1
 *                     remaining_count:
 *                       type: integer
 *                       description: Remaining downloads for this user's tier.
 *                       example: 1
 *             example:
 *               status: true
 *               data:
 *                 user_id: 1201
 *                 free_limit: 1
 *                 premium_limit: 50
 *                 downloaded_count: 0
 *                 remaining_free_count: 1
 *                 remaining_premium_count: 50
 *                 window_start: null
 *                 window_end: null
 *                 limit: 1
 *                 remaining_count: 1
 *       401:
 *         description: Missing or invalid token
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
 * /users/audiobook-download-log:
 *   delete:
 *     summary: Delete the logged-in user's download log rows for an episode
 *     description: |
 *       User comes from the Bearer token. Deletes rows in `audiobook_download_log`
 *       for that user, `audiobook_id`, and `episode_id` only.
 *       No matching rows returns `deleted_count` 0.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: audiobook_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1392
 *       - in: query
 *         name: episode_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 4401
 *     responses:
 *       200:
 *         description: Rows deleted for the logged-in user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 deleted_count:
 *                   type: integer
 *                   description: Number of rows removed. 0 when nothing matched.
 *                   example: 1
 *             example:
 *               status: true
 *               deleted_count: 1
 *       400:
 *         description: audiobook_id or episode_id is missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Bad request
 *       401:
 *         description: Missing or invalid token
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
 * /users/delete:
 *   delete:
 *     summary: DELETE delete
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
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
 * /users/update/{id}:
 *   put:
 *     summary: PUT update/id
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 * /users/update/withoutImage/{id}:
 *   put:
 *     summary: PUT update/withoutImage/id
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 * /users/update/withoutImagePhone/{id}:
 *   put:
 *     summary: PUT update/withoutImagePhone/id
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 * /users/update/from_payment/{id}:
 *   put:
 *     summary: PUT update/from_payment/id
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 * /users/{id}:
 *   get:
 *     summary: GET id
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 * /users/:
 *   get:
 *     summary: GET root
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [V1 User]
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
