const router = require('express').Router();
const KabbikChatAdminController = require('../../controllers/kabbik-chat-admin-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');

/**
 * @swagger
 * tags:
 *   name: Kabbik Chat Admin v2
 *   description: Admin-side Interact with Kabbik chat management (REST, polling-friendly)
 */

/**
 * @swagger
 * /kabbik/admin/conversations:
 *   get:
 *     summary: List all conversations (admin)
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *         description: Filter by conversation status
 *     responses:
 *       200:
 *         description: Paginated conversation list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConversationListResponse'
 *       401:
 *         description: Unauthorized / not admin
 */
router.get('/conversations', authorizeAdmin, KabbikChatAdminController.listConversations);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/messages:
 *   get:
 *     summary: Message history for a conversation (admin)
 *     description: |
 *       Two modes:
 *       - **Initial load**: omit `after_message_id` — returns paginated history via `page`/`pageSize`/`order`.
 *       - **Polling**: pass `after_message_id` — returns only messages with `id > after_message_id`, ordered ascending.
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ConversationIdPath'
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
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:id/messages',
  authorizeAdmin,
  KabbikChatAdminController.getMessages
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/reply:
 *   post:
 *     summary: Admin reply to a conversation
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ConversationIdPath'
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
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:id/reply',
  authorizeAdmin,
  KabbikChatAdminController.reply
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/read:
 *   post:
 *     summary: Mark all user messages in a conversation as read (admin)
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ConversationIdPath'
 *     responses:
 *       200:
 *         description: Messages marked read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkReadResponse'
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:id/read',
  authorizeAdmin,
  KabbikChatAdminController.markRead
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/close:
 *   patch:
 *     summary: Close a conversation
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ConversationIdPath'
 *     responses:
 *       200:
 *         description: Conversation closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConversationDetailResponse'
 *       404:
 *         description: Conversation not found
 */
router.patch(
  '/conversations/:id/close',
  authorizeAdmin,
  KabbikChatAdminController.closeConversation
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/reopen:
 *   patch:
 *     summary: Reopen a conversation
 *     tags: [Kabbik Chat Admin v2]
 *     servers:
 *       - url: http://localhost:8080/api/v2
 *         description: v2 — Kabbik Chat (REST)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ConversationIdPath'
 *     responses:
 *       200:
 *         description: Conversation reopened
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConversationDetailResponse'
 *       404:
 *         description: Conversation not found
 */
router.patch(
  '/conversations/:id/reopen',
  authorizeAdmin,
  KabbikChatAdminController.reopenConversation
);

module.exports = router;
