/**
 * @swagger
 * components:
 *   parameters:
 *     BlogIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Blog ID
 *     CommentIdPath:
 *       in: path
 *       name: commentId
 *       required: true
 *       schema:
 *         type: integer
 *       description: Comment ID
 *     ReactionTypeQuery:
 *       in: query
 *       name: type
 *       schema:
 *         type: string
 *         enum: [like, dislike]
 *       description: Filter reactions by type
 *
 *   schemas:
 *     BlogStats:
 *       type: object
 *       properties:
 *         likeCount:
 *           type: integer
 *           example: 12
 *         dislikeCount:
 *           type: integer
 *           example: 1
 *         commentCount:
 *           type: integer
 *           example: 5
 *         shareCount:
 *           type: integer
 *           example: 3
 *
 *     BlogDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: How to enjoy audiobooks
 *         slug:
 *           type: string
 *           example: how-to-enjoy-audiobooks
 *         excerpt:
 *           type: string
 *         content_body:
 *           type: string
 *         featured_image:
 *           type: string
 *         author:
 *           type: string
 *         user_id:
 *           type: integer
 *         approved:
 *           type: integer
 *         publish_date:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         likeCount:
 *           type: integer
 *           example: 12
 *         dislikeCount:
 *           type: integer
 *           example: 1
 *         commentCount:
 *           type: integer
 *           example: 5
 *         shareCount:
 *           type: integer
 *           example: 3
 *         myReaction:
 *           type: integer
 *           nullable: true
 *           description: '1=like, 2=dislike, null=no reaction'
 *           example: 1
 *
 *     BlogDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/BlogDetail'
 *
 *     BlogListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: How to enjoy audiobooks
 *         slug:
 *           type: string
 *           example: how-to-enjoy-audiobooks
 *         excerpt:
 *           type: string
 *         content_body:
 *           type: string
 *         featured_image:
 *           type: string
 *         author:
 *           type: string
 *         user_id:
 *           type: integer
 *         approved:
 *           type: integer
 *         publish_date:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *         like_count:
 *           type: integer
 *           example: 12
 *         dislike_count:
 *           type: integer
 *           example: 1
 *         comment_count:
 *           type: integer
 *           example: 5
 *         liked_by_me:
 *           type: boolean
 *           description: True when the current user has liked the blog (reaction_type = 1)
 *           example: true
 *         like_type:
 *           type: integer
 *           nullable: true
 *           description: '1=like, 2=dislike, null=no reaction'
 *           example: 1
 *
 *     BlogListResponse:
 *       type: object
 *       properties:
 *         list:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BlogListItem'
 *         count:
 *           type: integer
 *           description: Total number of blogs matching the query
 *           example: 42
 *
 *     ReactionMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             reaction_type:
 *               type: integer
 *               nullable: true
 *               description: '1=like, 2=dislike, null=removed'
 *               example: 1
 *             likeCount:
 *               type: integer
 *               example: 12
 *             dislikeCount:
 *               type: integer
 *               example: 1
 *
 *     BlogReactionItem:
 *       type: object
 *       properties:
 *         reaction_type:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         user_name:
 *           type: string
 *           example: johndoe
 *         full_name:
 *           type: string
 *           example: John Doe
 *         image_url:
 *           type: string
 *           nullable: true
 *
 *     BlogReactionsListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BlogReactionItem'
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
 *     CreateCommentRequest:
 *       type: object
 *       required:
 *         - comment
 *       properties:
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           example: Great article!
 *
 *     CreateCommentResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 10
 *             comment:
 *               type: string
 *               example: Great article!
 *             userId:
 *               type: integer
 *               example: 5
 *             blogId:
 *               type: integer
 *               example: 1
 *
 *     UpdateCommentRequest:
 *       type: object
 *       required:
 *         - comment
 *       properties:
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           example: Updated comment text
 *
 *     BlogCommentItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         comment:
 *           type: string
 *           example: Great article!
 *         userId:
 *           type: integer
 *           example: 5
 *         blogId:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         user_name:
 *           type: string
 *           example: johndoe
 *         full_name:
 *           type: string
 *           example: John Doe
 *         image_url:
 *           type: string
 *           nullable: true
 *
 *     BlogCommentsListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BlogCommentItem'
 *         total:
 *           type: integer
 *           example: 15
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     ShareBlogRequest:
 *       type: object
 *       properties:
 *         share_channel:
 *           type: string
 *           maxLength: 50
 *           example: whatsapp
 *           description: 'facebook, whatsapp, twitter, copy_link, internal'
 *
 *     ShareBlogResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             shareCount:
 *               type: integer
 *               example: 4
 */
