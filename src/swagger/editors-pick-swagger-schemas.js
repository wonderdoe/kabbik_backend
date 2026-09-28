/**
 * @swagger
 * components:
 *   parameters:
 *     EditorsPickIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Editor's Pick ID
 *
 *   schemas:
 *     EditorsPickAudiobook:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 45
 *         name:
 *           type: string
 *           example: The Great Adventure
 *         author_name:
 *           type: string
 *           example: Jane Author
 *         thumb_path:
 *           type: string
 *           example: /images/books/adventure.jpg
 *         total_duration:
 *           type: integer
 *           description: Total duration in seconds
 *           example: 18000
 *         play_count:
 *           type: integer
 *           example: 45210
 *         price:
 *           type: string
 *           example: "199.00"
 *         discount_price:
 *           type: string
 *           nullable: true
 *           example: "149.00"
 *         rating:
 *           type: number
 *           description: AVG(ratings.rating) from the ratings table; defaults to 5 when no ratings exist
 *           example: 4.7
 *
 *     EditorsPick:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         cap_title:
 *           type: string
 *           nullable: true
 *           example: Editor's Choice
 *         caption:
 *           type: string
 *           nullable: true
 *           example: A gripping story you won't put down
 *         banner:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/banners/pick-1.jpg
 *         position:
 *           type: integer
 *           example: 1
 *         audiobook:
 *           $ref: '#/components/schemas/EditorsPickAudiobook'
 *
 *     EditorsPickAdmin:
 *       allOf:
 *         - $ref: '#/components/schemas/EditorsPick'
 *         - type: object
 *           properties:
 *             audiobook_id:
 *               type: integer
 *               example: 45
 *             editor_id:
 *               type: integer
 *               example: 2
 *             is_active:
 *               type: integer
 *               enum: [0, 1]
 *               example: 1
 *             start_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: "2026-08-01T00:00:00.000Z"
 *             end_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: "2026-12-31T23:59:59.000Z"
 *             created_at:
 *               type: string
 *               format: date-time
 *               example: "2026-08-02T10:00:00.000Z"
 *             updated_at:
 *               type: string
 *               format: date-time
 *               example: "2026-08-02T10:00:00.000Z"
 *
 *     EditorsPickListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EditorsPick'
 *         total:
 *           type: integer
 *           example: 5
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     EditorsPickAdminListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EditorsPickAdmin'
 *         total:
 *           type: integer
 *           example: 10
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     EditorsPickDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/EditorsPick'
 *
 *     EditorsPickAdminDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/EditorsPickAdmin'
 *
 *     CreateEditorsPickRequest:
 *       type: object
 *       required:
 *         - audiobook_id
 *       properties:
 *         audiobook_id:
 *           type: integer
 *           example: 45
 *         cap_title:
 *           type: string
 *           maxLength: 255
 *           example: Editor's Choice
 *         caption:
 *           type: string
 *           maxLength: 500
 *           example: A gripping story you won't put down
 *         banner:
 *           type: string
 *           example: https://cdn.kabbik.com/banners/pick-1.jpg
 *         position:
 *           type: integer
 *           minimum: 0
 *           example: 1
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-08-01T00:00:00.000Z"
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-12-31T23:59:59.000Z"
 *
 *     UpdateEditorsPickRequest:
 *       type: object
 *       properties:
 *         cap_title:
 *           type: string
 *           maxLength: 255
 *         caption:
 *           type: string
 *           maxLength: 500
 *         banner:
 *           type: string
 *         position:
 *           type: integer
 *           minimum: 0
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         is_active:
 *           type: integer
 *           enum: [0, 1]
 *
 *     ReorderEditorsPickRequest:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - position
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               position:
 *                 type: integer
 *                 minimum: 0
 *                 example: 0
 */
