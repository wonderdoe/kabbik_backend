const router = require('express').Router();
const KabbikChatAdminController = require('../../controllers/kabbik-chat-admin-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorize = require('../../middlewares/auth-middleware');

/**
 * @swagger
 * tags:
 *   name: Kabbik Chat Admin
 *   description: Admin-side Interact with Kabbik chat management
 */

/**
 * @swagger
 * /kabbik/admin/conversations:
 *   get:
 *     summary: List all conversations (admin)
 *     tags: [Kabbik Chat Admin]
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
router.get('/conversations', authorize, KabbikChatAdminController.listConversations);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/messages:
 *   get:
 *     summary: Paginated messages for a conversation (admin)
 *     tags: [Kabbik Chat Admin]
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
 *     responses:
 *       200:
 *         description: Paginated messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageListResponse'
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:id/messages',
  authorize,
  KabbikChatAdminController.getMessages
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/reply:
 *   post:
 *     summary: Admin reply to a conversation
 *     tags: [Kabbik Chat Admin]
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
  authorize,
  KabbikChatAdminController.reply
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/close:
 *   patch:
 *     summary: Close a conversation
 *     tags: [Kabbik Chat Admin]
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
  authorize,
  KabbikChatAdminController.closeConversation
);

/**
 * @swagger
 * /kabbik/admin/conversations/{id}/reopen:
 *   patch:
 *     summary: Reopen a conversation
 *     tags: [Kabbik Chat Admin]
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
  authorize,
  KabbikChatAdminController.reopenConversation
);

module.exports = router;
