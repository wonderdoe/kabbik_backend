const router = require('express').Router();
const EventController = require('../../controllers/event-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeOptional = require('../../middlewares/auth-optional-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Admin-managed community events and user participation
 */

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     description: Admin only (role=2). Creates a new community event. user_id is taken from the admin JWT, not the request body.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventDetailResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authorize, EventController.create);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List events
 *     description: |
 *       Returns a paginated list of events. Public endpoint.
 *       Defaults to upcoming events (event_date_time >= NOW()). Use past=true for past events.
 *       Pass an optional Bearer token to include joined_by_me for the current user.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - $ref: '#/components/parameters/UpcomingQuery'
 *       - $ref: '#/components/parameters/PastQuery'
 *       - $ref: '#/components/parameters/EventTagQuery'
 *       - $ref: '#/components/parameters/EventTypeQuery'
 *       - $ref: '#/components/parameters/EventStatusQuery'
 *     responses:
 *       200:
 *         description: Paginated list of events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authorizeOptional, EventController.getAll);

/**
 * @swagger
 * /events/me/joined:
 *   get:
 *     summary: List events joined by the current user
 *     description: Returns a paginated list of events the authenticated user has joined, ordered by event_date_time ASC.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of joined events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me/joined', authorize, EventController.getMyJoined);

/**
 * @swagger
 * /events/user/{userId}/joined:
 *   get:
 *     summary: List events joined by a specific user
 *     description: |
 *       Returns a paginated list of events joined by the given user.
 *       Accessible by the user themselves or by an admin (role=2).
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *     responses:
 *       200:
 *         description: Paginated list of joined events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the user or an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/:userId/joined', authorize, EventController.getUserJoined);

/**
 * @swagger
 * /events/{id}/participants:
 *   get:
 *     summary: List event participants
 *     description: Admin only (role=2). Returns a paginated list of users who joined the event.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - $ref: '#/components/parameters/JoinStatusQuery'
 *     responses:
 *       200:
 *         description: Paginated list of participants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParticipantListResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/participants', authorize, EventController.getParticipants);

/**
 * @swagger
 * /events/{id}/join:
 *   post:
 *     summary: Join an event
 *     description: |
 *       Authenticated users can join an active event if seats are available.
 *       Idempotent if already joined. Returns 409 if the event is full.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *     responses:
 *       200:
 *         description: Joined successfully (or already joined)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinEventResponse'
 *       400:
 *         description: Event is not available for joining
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Event is full
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Event is full
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/join', authorize, EventController.join);

/**
 * @swagger
 * /events/{id}/join:
 *   delete:
 *     summary: Leave an event
 *     description: Cancels the authenticated user's participation in the event.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *     responses:
 *       200:
 *         description: Left event successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *       401:
 *         description: Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not joined or event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id/join', authorize, EventController.leave);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event detail
 *     description: |
 *       Returns full event detail including seatsLeft.
 *       Pass a Bearer token to get isJoinedByMe for the current user.
 *       Without a token, isJoinedByMe is always false.
 *     tags: [Events]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     responses:
 *       200:
 *         description: Event detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventDetailResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authorizeOptional, EventController.getById);

/**
 * @swagger
 * /events/{id}:
 *   patch:
 *     summary: Update an event
 *     description: |
 *       Admin only (role=2). Updates event fields.
 *       maxSeat cannot be set lower than the current joined_count.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEventRequest'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventDetailResponse'
 *       400:
 *         description: Validation error or maxSeat too low
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authorize, EventController.update);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Cancel / soft-delete an event
 *     description: Admin only (role=2). Sets deleted=1 and status=2 (cancelled). event_joins rows are preserved as history.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdPath'
 *     responses:
 *       200:
 *         description: Event cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessageResponse'
 *       401:
 *         description: Missing or invalid JWT token / not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authorize, EventController.delete);

module.exports = router;
