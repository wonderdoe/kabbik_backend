/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceLocalizedText:
 *       type: object
 *       properties:
 *         en:
 *           type: string
 *           nullable: true
 *           example: Under Maintenance
 *         bn:
 *           type: string
 *           nullable: true
 *           example: রক্ষণাবেক্ষণ চলছে
 *
 *     MaintenancePlatformStatus:
 *       type: object
 *       description: Effective maintenance state for one platform (window applied in SQL).
 *       properties:
 *         platform:
 *           type: string
 *           enum: [app, website]
 *           example: app
 *         isUnderMaintenance:
 *           type: boolean
 *           example: false
 *         title:
 *           $ref: '#/components/schemas/MaintenanceLocalizedText'
 *         message:
 *           $ref: '#/components/schemas/MaintenanceLocalizedText'
 *         startsAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Scheduled window start (UTC), or null
 *         endsAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Scheduled window end (UTC), or null
 *
 *     MaintenanceStatusBothResponse:
 *       type: object
 *       required: [app, website, serverTime]
 *       properties:
 *         app:
 *           $ref: '#/components/schemas/MaintenancePlatformStatus'
 *         website:
 *           $ref: '#/components/schemas/MaintenancePlatformStatus'
 *         serverTime:
 *           type: string
 *           format: date-time
 *           description: Server clock (UTC) for client countdowns
 *
 *     MaintenanceStatusSingleResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/MaintenancePlatformStatus'
 *         - type: object
 *           required: [serverTime]
 *           properties:
 *             serverTime:
 *               type: string
 *               format: date-time
 *
 *     MaintenanceErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: platform must be app or website
 */
