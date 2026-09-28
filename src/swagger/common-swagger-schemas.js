/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token from POST http://localhost:8080/api/v1/auth/login
 *     adminBearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: |
 *         Admin JWT (role=2) from POST http://localhost:8080/api/v1/auth/login-admin,
 *         or bootstrap via POST http://localhost:8080/api/v1/auth/dev/bootstrap-admin (dev only).
 *         Use this token for admin-only write endpoints (e.g. podcast create, update, delete).
 *
 *   parameters:
 *     PageQuery:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number (1-based)
 *     PageSizeQuery:
 *       in: query
 *       name: pageSize
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: Number of items per page (max 100)
 *     IdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Resource ID
 *
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Not found
 *
 *     SuccessMessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Operation completed successfully
 *
 *     PaginatedMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 100
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 */

module.exports = {};
