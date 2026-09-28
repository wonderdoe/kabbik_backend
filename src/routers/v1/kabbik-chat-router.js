const router = require('express').Router();
const KabbikChatController = require('../../controllers/kabbik-chat-controller');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: Kabbik Chat
 *   description: User-side Interact with Kabbik chat (REST)
 */

/**
 * @swagger
 * /kabbik/conversation:
 *   post:
 *     summary: Get or create the current user's conversation
 *     description: Idempotent — returns existing conversation if one already exists for this user.
 *     tags: [Kabbik Chat]
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
 *   get:
 *     summary: Paginated message history for the current user's conversation
 *     tags: [Kabbik Chat]
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
 *         description: Sort order by created_at within page
 *     responses:
 *       200:
 *         description: Paginated messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/conversation/messages', authorize, KabbikChatController.getMessages);

/**
 * @swagger
 * /kabbik/conversation/read:
 *   post:
 *     summary: Mark all admin messages in the user's conversation as read
 *     tags: [Kabbik Chat]
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
