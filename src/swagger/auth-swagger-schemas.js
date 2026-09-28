/**
 * @swagger
 * components:
 *   schemas:
 *     AuthLoginRequest:
 *       type: object
 *       required:
 *         - user_name
 *         - full_name
 *       properties:
 *         user_name:
 *           type: string
 *           example: '8801712345678'
 *         full_name:
 *           type: string
 *           example: John Doe
 *         auth_src:
 *           type: string
 *           example: android
 *         image_url:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *
 *     AuthLoginPasswordRequest:
 *       type: object
 *       required:
 *         - msisdn
 *         - password
 *       properties:
 *         msisdn:
 *           type: string
 *           example: '8801712345678'
 *         password:
 *           type: string
 *           format: password
 *           example: mySecurePassword123
 *         device_info:
 *           type: object
 *           description: Optional device metadata (camelCase or snake_case keys accepted)
 *           properties:
 *             deviceId:
 *               type: string
 *               example: 2406E416-F766-4E8B-88B6-85B6EA4E4CD7
 *             device_id:
 *               type: string
 *               example: 2406E416-F766-4E8B-88B6-85B6EA4E4CD7
 *             deviceName:
 *               type: string
 *               example: iPhone 17 Pro Max
 *             device_name:
 *               type: string
 *               example: iPhone 17 Pro Max
 *             deviceModel:
 *               type: string
 *               example: iPhone
 *             model:
 *               type: string
 *               example: iPhone
 *             os:
 *               type: string
 *               example: iOS
 *
 *     AuthTokenResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
 *         user:
 *           type: object
 *           additionalProperties: true
 *         deviceLimitExceed:
 *           type: boolean
 *           example: false
 *         deviceLimit:
 *           type: integer
 *           example: 2
 *
 *     OtpCreateRequest:
 *       type: object
 *       required:
 *         - msisdn
 *       properties:
 *         msisdn:
 *           type: string
 *           example: '8801712345678'
 *
 *     OtpVerifyRequest:
 *       type: object
 *       required:
 *         - msisdn
 *         - otp
 *       properties:
 *         msisdn:
 *           type: string
 *           example: '8801712345678'
 *         otp:
 *           type: string
 *           example: '123456'
 *
 *     AuthAdminLoginRequest:
 *       type: object
 *       required:
 *         - user_name
 *         - password
 *       properties:
 *         user_name:
 *           type: string
 *           description: Admin username (users table, role=2)
 *           example: admin
 *         password:
 *           type: string
 *           format: password
 *           example: myAdminPassword123
 *
 *     AuthAdminLoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Admin JWT (role=2) — paste into Swagger Authorize → adminBearerAuth
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
 *         user:
 *           type: object
 *           additionalProperties: true
 *           description: Admin profile (pass_hash excluded)
 *
 *     DevBootstrapAdminRequest:
 *       type: object
 *       description: All fields optional — defaults used when omitted (see endpoint description).
 *       properties:
 *         user_name:
 *           type: string
 *           description: Defaults to DEV_ADMIN_USERNAME env or swagger_admin
 *           example: swagger_admin
 *         password:
 *           type: string
 *           format: password
 *           description: Defaults to DEV_ADMIN_PASSWORD env or SwaggerAdmin@123
 *           example: SwaggerAdmin@123
 *         full_name:
 *           type: string
 *           example: Swagger Admin
 *
 *     DevBootstrapAdminResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Admin JWT (role=2) — paste into Swagger Authorize → adminBearerAuth
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
 *         user:
 *           type: object
 *           additionalProperties: true
 *         bootstrapped:
 *           type: boolean
 *           example: true
 *         password_reset:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Dev admin ready — paste token into adminBearerAuth
 */

module.exports = {};
