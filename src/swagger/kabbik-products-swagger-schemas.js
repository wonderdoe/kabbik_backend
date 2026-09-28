/**
 * @swagger
 * components:
 *   schemas:
 *     KabbikProduct:
 *       type: object
 *       properties:
 *         id:                    { type: integer }
 *         product_name:          { type: string }
 *         image_url:             { type: string }
 *         redirect_url_android:  { type: string, nullable: true }
 *         redirect_url_ios:      { type: string, nullable: true }
 *         fallback_url_android:  { type: string, nullable: true }
 *         fallback_url_ios:      { type: string, nullable: true }
 *         is_active:             { type: boolean }
 *         created_at:            { type: string, format: date-time }
 *         updated_at:            { type: string, format: date-time }
 *
 *     KabbikProductInput:
 *       type: object
 *       required: [product_name, image_url]
 *       properties:
 *         product_name:          { type: string }
 *         image_url:             { type: string }
 *         redirect_url_android:  { type: string, nullable: true }
 *         redirect_url_ios:      { type: string, nullable: true }
 *         fallback_url_android:  { type: string, nullable: true }
 *         fallback_url_ios:      { type: string, nullable: true }
 *
 *     KabbikProductPatch:
 *       type: object
 *       description: All fields optional — only provided fields are updated
 *       properties:
 *         product_name:          { type: string }
 *         image_url:             { type: string }
 *         redirect_url_android:  { type: string, nullable: true }
 *         redirect_url_ios:      { type: string, nullable: true }
 *         fallback_url_android:  { type: string, nullable: true }
 *         fallback_url_ios:      { type: string, nullable: true }
 *         is_active:             { type: boolean }
 *
 *     KabbikProductListResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *           example: 200
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KabbikProduct'
 *
 *     KabbikProductErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: product_name is required
 */
