/**
 * @swagger
 * components:
 *   parameters:
 *     EventIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Event ID
 *     UpcomingQuery:
 *       in: query
 *       name: upcoming
 *       schema:
 *         type: string
 *         enum: ['true', 'false', '1', '0']
 *         default: 'true'
 *       description: Filter upcoming events (event_date_time >= NOW). Default behavior when past is not set.
 *     PastQuery:
 *       in: query
 *       name: past
 *       schema:
 *         type: string
 *         enum: ['true', 'false', '1', '0']
 *       description: Filter past events (event_date_time < NOW)
 *     EventTagQuery:
 *       in: query
 *       name: tag
 *       schema:
 *         type: string
 *       description: Filter by event tag
 *     EventTypeQuery:
 *       in: query
 *       name: event_type
 *       schema:
 *         type: string
 *       description: Filter by event type
 *     EventStatusQuery:
 *       in: query
 *       name: status
 *       schema:
 *         type: integer
 *         enum: [1, 2, 3]
 *       description: Filter by event status (1=active, 2=cancelled, 3=completed)
 *     JoinStatusQuery:
 *       in: query
 *       name: status
 *       schema:
 *         type: integer
 *         enum: [1, 2, 3]
 *         default: 1
 *       description: Filter participants by join status (1=joined, 2=cancelled, 3=waitlisted)
 *
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 5
 *         title:
 *           type: string
 *           example: Kabbik Community Meetup
 *         description:
 *           type: string
 *           nullable: true
 *           example: Join us for a live audiobook listening session.
 *         event_type:
 *           type: string
 *           nullable: true
 *           example: meetup
 *         location:
 *           type: string
 *           nullable: true
 *           example: Dhaka, Bangladesh
 *         event_date_time:
 *           type: string
 *           format: date-time
 *           example: "2026-09-15T18:00:00.000Z"
 *         maxSeat:
 *           type: integer
 *           example: 50
 *         joined_count:
 *           type: integer
 *           example: 12
 *         tag:
 *           type: string
 *           nullable: true
 *           example: Community
 *         tagColor:
 *           type: string
 *           nullable: true
 *           example: "#FF5733"
 *         banner_image:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/events/banner.jpg
 *         status:
 *           type: integer
 *           description: 1=active, 2=cancelled, 3=completed
 *           example: 1
 *         joined_by_me:
 *           type: boolean
 *           description: True if the authenticated user has joined this event. Always false when unauthenticated.
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     EventDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Event'
 *         - type: object
 *           properties:
 *             seatsLeft:
 *               type: integer
 *               description: Remaining seats (maxSeat - joined_count)
 *               example: 38
 *             isJoinedByMe:
 *               type: boolean
 *               description: True if the authenticated user has joined. Always false when unauthenticated.
 *               example: false
 *
 *     CreateEventRequest:
 *       type: object
 *       required:
 *         - title
 *         - event_date_time
 *         - maxSeat
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: Kabbik Community Meetup
 *         description:
 *           type: string
 *           example: Join us for a live audiobook listening session.
 *         event_type:
 *           type: string
 *           example: meetup
 *         location:
 *           type: string
 *           example: Dhaka, Bangladesh
 *         event_date_time:
 *           type: string
 *           format: date-time
 *           example: "2026-09-15T18:00:00.000Z"
 *         maxSeat:
 *           type: integer
 *           minimum: 1
 *           example: 50
 *         tag:
 *           type: string
 *           example: Community
 *         tagColor:
 *           type: string
 *           example: "#FF5733"
 *         banner_image:
 *           type: string
 *           example: https://cdn.kabbik.com/events/banner.jpg
 *
 *     UpdateEventRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *         description:
 *           type: string
 *         event_type:
 *           type: string
 *         location:
 *           type: string
 *         event_date_time:
 *           type: string
 *           format: date-time
 *         maxSeat:
 *           type: integer
 *           minimum: 1
 *         tag:
 *           type: string
 *         tagColor:
 *           type: string
 *         banner_image:
 *           type: string
 *         status:
 *           type: integer
 *           enum: [1, 2, 3]
 *
 *     EventListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Event'
 *         total:
 *           type: integer
 *           example: 42
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     EventDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/EventDetail'
 *
 *     EventParticipant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         event_id:
 *           type: integer
 *           example: 5
 *         user_id:
 *           type: integer
 *           example: 10
 *         status:
 *           type: integer
 *           example: 1
 *         joined_at:
 *           type: string
 *           format: date-time
 *         full_name:
 *           type: string
 *           example: John Doe
 *         user_email:
 *           type: string
 *           example: john@example.com
 *         image_url:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *
 *     ParticipantListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventParticipant'
 *         total:
 *           type: integer
 *           example: 12
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     JoinEventResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Joined event successfully
 *         data:
 *           $ref: '#/components/schemas/EventDetail'
 */
