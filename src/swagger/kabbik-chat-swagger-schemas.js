/**
 * @swagger
 * components:
 *   parameters:
 *     ConversationIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Conversation ID
 *
 *     AfterMessageIdQuery:
 *       in: query
 *       name: after_message_id
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: |
 *         Cursor for polling — returns only messages with id greater than this value.
 *         When provided, page/pageSize/order are ignored.
 *
 *     LimitQuery:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 50
 *       description: Max messages to return when using after_message_id polling
 *
 *   schemas:
 *     KabbikConversation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 6
 *         user_id:
 *           type: integer
 *           example: 2391291
 *         subject:
 *           type: string
 *           nullable: true
 *           example: support
 *         status:
 *           type: integer
 *           description: 1=open, 2=closed
 *           example: 1
 *         last_message_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: '2026-08-17T10:30:00.000Z'
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: '2026-08-16T17:09:02.000Z'
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: '2026-08-16T17:09:02.000Z'
 *         full_name:
 *           type: string
 *           description: Present on admin list responses
 *           example: John Doe
 *         image_url:
 *           type: string
 *           description: Present on admin list responses
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *         unread_from_user_count:
 *           type: integer
 *           description: Present on admin list responses
 *           example: 2
 *
 *     KabbikMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         conversation_id:
 *           type: integer
 *           example: 6
 *         sender_type:
 *           type: integer
 *           description: 1=user, 2=admin/kabbik
 *           example: 1
 *         sender_id:
 *           type: integer
 *           example: 2391291
 *         message:
 *           type: string
 *           example: Hello, I need help with my subscription
 *         is_read:
 *           type: integer
 *           example: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: '2026-08-17T10:31:00.000Z'
 *
 *     CreateConversationRequest:
 *       type: object
 *       properties:
 *         subject:
 *           type: string
 *           maxLength: 255
 *           example: Payment issue
 *
 *     SendMessageRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           minLength: 1
 *           maxLength: 5000
 *           example: Hello from Postman
 *
 *     ConversationDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/KabbikConversation'
 *
 *     ConversationListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KabbikConversation'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         pageSize:
 *           type: integer
 *
 *     MessageDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/KabbikMessage'
 *
 *     MessageListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KabbikMessage'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         pageSize:
 *           type: integer
 *
 *     MessageCursorResponse:
 *       type: object
 *       description: Response when polling with after_message_id
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KabbikMessage'
 *         after_message_id:
 *           type: integer
 *           description: Last message id returned (or the input id if no new messages)
 *
 *     MarkReadResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             updated:
 *               type: integer
 *             conversation_id:
 *               type: integer
 */
