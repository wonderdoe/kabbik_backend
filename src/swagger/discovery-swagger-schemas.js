/**
 * @swagger
 * components:
 *   parameters:
 *     MonthQuery:
 *       in: query
 *       name: month
 *       schema:
 *         type: string
 *         pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *         example: '2026-07'
 *       description: Calendar month in YYYY-MM format. Defaults to the current month.
 *     LimitQuery:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 50
 *         default: 10
 *       description: Maximum number of results to return (1–50).
 *
 *   schemas:
 *     CurrentlyListeningItem:
 *       type: object
 *       properties:
 *         book_id:
 *           type: integer
 *           example: 1
 *         current_episode:
 *           type: integer
 *           example: 4
 *         current_timer:
 *           type: integer
 *           example: 1820
 *         total_duration:
 *           type: integer
 *           example: 18000
 *         progress_percent:
 *           type: integer
 *           example: 62
 *         book_name:
 *           type: string
 *           nullable: true
 *           example: The Alchemist
 *         book_cover:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/books/thumb.jpg
 *
 *     ListeningStats:
 *       type: object
 *       properties:
 *         total_listened_hours:
 *           type: number
 *           format: float
 *           example: 128.5
 *         total_books_completed:
 *           type: integer
 *           example: 34
 *         last_month_completed_books:
 *           type: integer
 *           example: 5
 *         currently_listening:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CurrentlyListeningItem'
 *
 *     ListeningStatsResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/ListeningStats'
 *
 *     TopContributor:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 7
 *         full_name:
 *           type: string
 *           example: Rafiul Islam
 *         image_url:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *         total_listen_hours_this_month:
 *           type: number
 *           format: float
 *           example: 62.3
 *         total_books_completed:
 *           type: integer
 *           example: 9
 *
 *     TopContributorsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TopContributor'
 *
 *     TopAuthor:
 *       type: object
 *       properties:
 *         author_id:
 *           type: integer
 *           example: 12
 *         name:
 *           type: string
 *           example: Humayun Ahmed
 *         en_name:
 *           type: string
 *           nullable: true
 *           example: Humayun Ahmed
 *         imageUrl:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/authors/12.jpg
 *         total_books:
 *           type: integer
 *           example: 45
 *         total_play_count:
 *           type: integer
 *           example: 892340
 *
 *     TopAuthorsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TopAuthor'
 *
 *     PopularCategory:
 *       type: object
 *       properties:
 *         category_id:
 *           type: integer
 *           example: 3
 *         name:
 *           type: string
 *           example: Motivational
 *         thumb_path:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/categories/motivational.jpg
 *         total_listeners:
 *           type: integer
 *           example: 15420
 *
 *     PopularCategoriesResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PopularCategory'
 */
