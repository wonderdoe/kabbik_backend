/**
 * @swagger
 * components:
 *   parameters:
 *     RentPageQuery:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number (1-based). Non-numeric or invalid values fall back to 1.
 *     RentLimitQuery:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: Items per page (1–100). Non-numeric or invalid values fall back to 20.
 *     RentMonthsQuery:
 *       in: query
 *       name: months
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 4
 *       description: Lookback window in months. For `trending`, counts paid rentals in the last N months. For `new-releases`, limits catalog additions to the last N months. Non-numeric or ≤ 0 falls back to 4; invalid values appear in `meta.ignored_filters`.
 *     RentCategoryIdQuery:
 *       in: query
 *       name: category_id
 *       schema:
 *         type: integer
 *       description: Optional category filter. Non-numeric values are ignored and listed in `meta.ignored_filters`.
 *     RentChannelIdQuery:
 *       in: query
 *       name: channel_id
 *       schema:
 *         type: integer
 *       description: Optional channel filter. Non-numeric values are ignored and listed in `meta.ignored_filters`.
 *     RentSearchQuery:
 *       in: query
 *       name: q
 *       required: true
 *       schema:
 *         type: string
 *         example: harry
 *       description: Search term for book name or author name. Tokens shorter than 3 characters are dropped after sanitization.
 *
 *   schemas:
 *     RentAudiobookCard:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1477
 *         name:
 *           type: string
 *           example: রিচ ড্যাড পুওর ড্যাড
 *         en_name:
 *           type: string
 *           nullable: true
 *           example: Rich Dad Poor Dad
 *         author_name:
 *           type: string
 *           nullable: true
 *           example: Robert Kiyosaki
 *         en_author_name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         thumb_path:
 *           type: string
 *           nullable: true
 *         banner_path:
 *           type: string
 *           nullable: true
 *         price:
 *           type: number
 *           nullable: true
 *           example: 49
 *         discount_price:
 *           type: number
 *           nullable: true
 *           example: 0
 *         price_in_usd:
 *           type: number
 *           nullable: true
 *         publish_year:
 *           type: integer
 *           nullable: true
 *         rent_duration_in_month:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         rent_duration_in_day:
 *           type: integer
 *           nullable: true
 *           example: 60
 *         total_duration:
 *           type: number
 *           nullable: true
 *           example: 27129.65
 *         category_id:
 *           type: integer
 *           nullable: true
 *         channel_id:
 *           type: integer
 *           nullable: true
 *         premium:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         play_count:
 *           type: integer
 *           nullable: true
 *           example: 171885
 *         created_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     RentTrendingAudiobookCard:
 *       allOf:
 *         - $ref: '#/components/schemas/RentAudiobookCard'
 *         - type: object
 *           required: [rent_count]
 *           properties:
 *             rent_count:
 *               type: integer
 *               description: Paid rental count in the lookback window
 *               example: 19
 *
 *     RentPaginationMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 137
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total_pages:
 *           type: integer
 *           example: 7
 *         applied_filters:
 *           type: object
 *           description: Filters actually applied (null values mean not provided)
 *           additionalProperties: true
 *           example:
 *             category_id: null
 *             channel_id: 1
 *         ignored_filters:
 *           type: array
 *           items:
 *             type: string
 *           description: Query params present but invalid; omitted when empty
 *           example: ["category_id"]
 *
 *     RentListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RentAudiobookCard'
 *         meta:
 *           $ref: '#/components/schemas/RentPaginationMeta'
 *
 *     RentTrendingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RentTrendingAudiobookCard'
 *         meta:
 *           $ref: '#/components/schemas/RentPaginationMeta'
 *
 *     RentSearchAudiobookCard:
 *       allOf:
 *         - $ref: '#/components/schemas/RentAudiobookCard'
 *         - type: object
 *           required: [relevance]
 *           properties:
 *             relevance:
 *               type: number
 *               format: float
 *               description: FULLTEXT relevance score
 *               example: 12.45
 *
 *     RentSearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RentSearchAudiobookCard'
 *         meta:
 *           $ref: '#/components/schemas/RentPaginationMeta'
 *
 *     UserRentItem:
 *       type: object
 *       properties:
 *         rent_id:
 *           type: integer
 *           example: 42
 *         audiobook_id:
 *           type: integer
 *           example: 1477
 *         rented_at:
 *           type: string
 *           format: date-time
 *           example: '2025-08-01T10:15:30.000Z'
 *         expired_at:
 *           type: string
 *           format: date-time
 *           example: '2025-10-01T10:15:30.000Z'
 *         is_purchased:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: রিচ ড্যাড পুওর ড্যাড
 *         en_name:
 *           type: string
 *           nullable: true
 *           example: Rich Dad Poor Dad
 *         author_name:
 *           type: string
 *           nullable: true
 *           example: Robert Kiyosaki
 *         en_author_name:
 *           type: string
 *           nullable: true
 *           example: Robert Kiyosaki
 *         thumb_path:
 *           type: string
 *           nullable: true
 *           example: /uploads/audiobooks/thumbs/rich-dad-poor-dad.jpg
 *         banner_path:
 *           type: string
 *           nullable: true
 *           example: /uploads/audiobooks/banners/rich-dad-poor-dad.jpg
 *         rent_duration_in_day:
 *           type: integer
 *           nullable: true
 *           example: 60
 *         rent_duration_in_month:
 *           type: integer
 *           nullable: true
 *           example: 2
 *
 *     UserRentListResponse:
 *       type: object
 *       required: [success, data, meta]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserRentItem'
 *         meta:
 *           type: object
 *           required: [total, page, limit, total_pages]
 *           properties:
 *             total:
 *               type: integer
 *               example: 5
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             total_pages:
 *               type: integer
 *               example: 1
 *       example:
 *         success: true
 *         data:
 *           - rent_id: 42
 *             audiobook_id: 1477
 *             rented_at: '2025-08-01T10:15:30.000Z'
 *             expired_at: '2025-10-01T10:15:30.000Z'
 *             is_purchased: 1
 *             name: রিচ ড্যাড পুওর ড্যাড
 *             en_name: Rich Dad Poor Dad
 *             author_name: Robert Kiyosaki
 *             en_author_name: Robert Kiyosaki
 *             thumb_path: /uploads/audiobooks/thumbs/rich-dad-poor-dad.jpg
 *             banner_path: /uploads/audiobooks/banners/rich-dad-poor-dad.jpg
 *             rent_duration_in_day: 60
 *             rent_duration_in_month: 2
 *         meta:
 *           total: 5
 *           page: 1
 *           limit: 20
 *           total_pages: 1
 */

module.exports = {};
