const router = require('express').Router();
const KabbikChatController = require('../../controllers/kabbik-chat-controller');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: Kabbik Chat v2
 *   description: User-side Interact with Kabbik chat (REST, polling-friendly)
 */

/**
 * @swagger
 * /kabbik/conversation:
 *   post:
 *     summary: Get or create the current user's conversation
 *     description: Idempotent — returns existing conversation if one already exists for this user.
 *     tags: [Kabbik Chat v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateConversationRequest'
 *     responses:
 *       200:
 *         description: Conversation retrieved or created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConversationDetailResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/conversation', authorize, KabbikChatController.getOrCreateConversation);

/**
 * @swagger
 * /kabbik/conversation/messages:
 *   post:
 *     summary: Send a message in the current user's conversation
 *     description: |
 *       Sends a message into the authenticated user's own conversation.
 *       Conversation must exist (call POST /conversation first).
 *       If the conversation is closed, it is automatically reopened.
 *     tags: [Kabbik Chat v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageDetailResponse'
 *       400:
 *         description: Validation error or conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/conversation/messages', authorize, KabbikChatController.sendMessage);

/**
 * @swagger
 * /kabbik/conversation/messages:
 *   get:
 *     summary: Message history for the current user's conversation
 *     description: |
 *       Two modes:
 *       - **Initial load**: omit `after_message_id` — returns paginated history via `page`/`pageSize`/`order`.
 *       - **Polling**: pass `after_message_id` — returns only messages with `id > after_message_id`, ordered ascending.
 *     tags: [Kabbik Chat v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order by created_at (initial load only)
 *       - $ref: '#/components/parameters/AfterMessageIdQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: Messages retrieved
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MessageListResponse'
 *                 - $ref: '#/components/schemas/MessageCursorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/conversation/messages', authorize, KabbikChatController.getMessages);

/**
 * @swagger
 * /kabbik/conversation/read:
 *   post:
 *     summary: Mark all admin messages in the user's conversation as read
 *     tags: [Kabbik Chat v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messages marked read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkReadResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/conversation/read', authorize, KabbikChatController.markRead);

module.exports = router;
