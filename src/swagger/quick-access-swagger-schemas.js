/**
 * @swagger
 * components:
 *   schemas:
 *     QuickAccessItem:
 *       type: object
 *       description: Active quick access shortcut for the mobile app (public fields only).
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         en_name:
 *           type: string
 *           example: Rent
 *         bn_name:
 *           type: string
 *           example: রেন্ট
 *         goto_page:
 *           type: string
 *           example: /rent
 *
 *     QuickAccessListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Quick access items retrieved
 *         data:
 *           type: array
 *           description: Ordered by `sort_order` ASC, then `id` ASC.
 *           items:
 *             $ref: '#/components/schemas/QuickAccessItem'
 */
