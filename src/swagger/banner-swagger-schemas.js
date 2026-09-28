/**
 * @swagger
 * components:
 *   parameters:
 *     BannerIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Promotion banner ID
 *     BannerIsActiveQuery:
 *       in: query
 *       name: is_active
 *       schema:
 *         type: integer
 *         enum: [0, 1]
 *       description: Filter by active status (1 = active, 0 = inactive)
 *   schemas:
 *     PromotionBannerPayload:
 *       type: object
 *       nullable: true
 *       additionalProperties: true
 *       description: Optional JSON metadata for the banner (stored as MySQL JSON; returned as object)
 *       example:
 *         campaign_id: summer-2026
 *         cta_label: Listen now
 *         deep_link_params:
 *           audiobook_id: 123
 *
 *     PromotionBanner:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         banner_url:
 *           type: string
 *           example: https://cdn.kabbik.com/banners/promo-summer.jpg
 *         goto_page:
 *           type: string
 *           example: /audiobooks/123
 *         is_active:
 *           type: integer
 *           enum: [0, 1]
 *           example: 1
 *         payload:
 *           $ref: '#/components/schemas/PromotionBannerPayload'
 *         target_audience:
 *           type: string
 *           enum: [all, free, premium]
 *           example: all
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: '2026-09-21T10:00:00.000Z'
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: '2026-09-21T10:00:00.000Z'
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *
 *     CreatePromotionBannerRequest:
 *       type: object
 *       required:
 *         - banner_url
 *         - goto_page
 *       properties:
 *         banner_url:
 *           type: string
 *           example: https://cdn.kabbik.com/banners/promo-summer.jpg
 *         goto_page:
 *           type: string
 *           example: /audiobooks/123
 *         is_active:
 *           type: integer
 *           enum: [0, 1]
 *           default: 1
 *           example: 1
 *         payload:
 *           $ref: '#/components/schemas/PromotionBannerPayload'
 *         target_audience:
 *           type: string
 *           enum: [all, free, premium]
 *           default: all
 *           example: all
 *
 *     UpdatePromotionBannerRequest:
 *       type: object
 *       properties:
 *         banner_url:
 *           type: string
 *           example: https://cdn.kabbik.com/banners/promo-updated.jpg
 *         goto_page:
 *           type: string
 *           example: /home
 *         is_active:
 *           type: integer
 *           enum: [0, 1]
 *           example: 0
 *         payload:
 *           $ref: '#/components/schemas/PromotionBannerPayload'
 *         target_audience:
 *           type: string
 *           enum: [all, free, premium]
 *           example: premium
 *
 *     PromotionBannerResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/PromotionBanner'
 *         message:
 *           type: string
 *           example: Banner retrieved
 *
 *     PromotionBannerListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PromotionBanner'
 *         message:
 *           type: string
 *           example: Banners retrieved
 *
 *     PromotionBannerDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Banner deleted
 */
