const router = require('express').Router();
const EditorsPickController = require('../../controllers/editors-pick-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: EditorsPicks
 *   description: Admin-curated highlighted audiobooks for the Editor's Pick section
 */

/**
 * @swagger
 * /editors-picks:
 *   post:
 *     summary: Create a new editor's pick
 *     description: Admin only (role=2). editor_id is taken from the admin JWT, not the request body.
 *     tags: [EditorsPicks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEditorsPickRequest'
 *     responses:
 *       201:
 *         description: Editor pick created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EditorsPickAdminDetailResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Audiobook not found
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
router.post('/', authorize, EditorsPickController.create);

/**
 * @swagger
 * /editors-picks/all:
 *   get:
 *     summary: List all editor's picks (admin)
 *     description: Admin only. Returns all non-deleted picks including inactive and expired, ordered by position ASC.
 *     tags: [EditorsPicks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of all editor picks with enriched audiobook data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EditorsPickAdminListResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
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
router.get('/all', authorize, EditorsPickController.getAllAdmin);

/**
 * @swagger
 * /editors-picks/reorder:
 *   patch:
 *     summary: Bulk reorder editor's picks
 *     description: Admin only. Updates positions for multiple picks in a single transaction.
 *     tags: [EditorsPicks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderEditorsPickRequest'
 *     responses:
 *       200:
 *         description: Editor picks reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
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
router.patch('/reorder', authorize, EditorsPickController.reorder);

/**
 * @swagger
 * /editors-picks:
 *   get:
 *     summary: List active editor's picks (public)
 *     description: Returns currently active picks filtered by is_active, date range, and approved non-deleted audiobooks. Ordered by position ASC.
 *     tags: [EditorsPicks]
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of active editor picks with enriched audiobook data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EditorsPickListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', EditorsPickController.getActive);

/**
 * @swagger
 * /editors-picks/{id}:
 *   get:
 *     summary: Get a single active editor's pick (public)
 *     description: Returns pick detail with enriched audiobook data. 404 if not found, inactive, expired, or deleted.
 *     tags: [EditorsPicks]
 *     parameters:
 *       - $ref: '#/components/parameters/EditorsPickIdPath'
 *     responses:
 *       200:
 *         description: Editor pick detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EditorsPickDetailResponse'
 *       400:
 *         description: Invalid pick id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Editor pick not found
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
router.get('/:id', EditorsPickController.getActiveById);

/**
 * @swagger
 * /editors-picks/{id}:
 *   patch:
 *     summary: Update an editor's pick
 *     description: Admin only. Update cap_title, caption, banner, position, start_date, end_date, and is_active.
 *     tags: [EditorsPicks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EditorsPickIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEditorsPickRequest'
 *     responses:
 *       200:
 *         description: Editor pick updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EditorsPickAdminDetailResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Editor pick not found
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
router.patch('/:id', authorize, EditorsPickController.update);

/**
 * @swagger
 * /editors-picks/{id}:
 *   delete:
 *     summary: Soft-delete an editor's pick
 *     description: Admin only. Sets deleted = 1.
 *     tags: [EditorsPicks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EditorsPickIdPath'
 *     responses:
 *       200:
 *         description: Editor pick deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *       400:
 *         description: Invalid pick id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Editor pick not found
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
router.delete('/:id', authorize, EditorsPickController.softDelete);

module.exports = router;
