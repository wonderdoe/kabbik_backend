/**
 * @swagger
 * components:
 *   parameters:
 *     PostIdPath:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Post ID
 *     UserIdPath:
 *       in: path
 *       name: userId
 *       required: true
 *       schema:
 *         type: integer
 *       description: User ID
 *     CommentIdPath:
 *       in: path
 *       name: commentId
 *       required: true
 *       schema:
 *         type: integer
 *       description: Comment ID
 *     PostTypeQuery:
 *       in: query
 *       name: post_type
 *       required: false
 *       schema:
 *         type: string
 *         example: question
 *       description: Filter posts by active post type slug
 *     SortQuery:
 *       in: query
 *       name: sort
 *       required: false
 *       schema:
 *         type: string
 *         enum: [recent, trending]
 *         default: recent
 *       description: Sort order — recent (created_at desc, default) or trending (hot score desc)
 *
 *   schemas:
 *     PostType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 2
 *         name:
 *           type: string
 *           example: Question
 *         slug:
 *           type: string
 *           example: question
 *
 *     PostTypeListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostType'
 *
 *     PostAuthor:
 *       type: object
 *       properties:
 *         user_name:
 *           type: string
 *           example: johndoe
 *         full_name:
 *           type: string
 *           example: John Doe
 *         image_url:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *
 *     PostAudiobook:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: integer
 *           example: 42
 *         name:
 *           type: string
 *           example: The Great Gatsby
 *         thumb_path:
 *           type: string
 *           example: /images/books/gatsby.jpg
 *         author_name:
 *           type: string
 *           example: F. Scott Fitzgerald
 *
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 10
 *         content:
 *           type: string
 *           nullable: true
 *           example: Just finished this amazing audiobook!
 *         title:
 *           type: string
 *           nullable: true
 *           maxLength: 255
 *           description: Allowed only when post_type slug is discussion; required for discussion posts
 *           example: Anyone else finish this ending confused?
 *         is_spoiler:
 *           type: boolean
 *           example: false
 *         like_count:
 *           type: integer
 *           example: 15
 *         comment_count:
 *           type: integer
 *           example: 3
 *         share_count:
 *           type: integer
 *           example: 2
 *         liked_by_me:
 *           type: boolean
 *           description: True if the authenticated user has liked this post. Always false when unauthenticated.
 *           example: false
 *         status:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *         author:
 *           $ref: '#/components/schemas/PostAuthor'
 *         post_type:
 *           $ref: '#/components/schemas/PostType'
 *         audiobook:
 *           $ref: '#/components/schemas/PostAudiobook'
 *
 *     PostDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Post'
 *         - type: object
 *           properties:
 *             is_liked_by_me:
 *               type: boolean
 *               description: True if the authenticated user has liked this post. Always false when unauthenticated.
 *               example: false
 *
 *     PostListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Post'
 *         total:
 *           type: integer
 *           description: Total number of posts matching the query
 *           example: 42
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
 *
 *     PostDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/PostDetail'
 *
 *     CreatePostRequest:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           maxLength: 5000
 *           description: Post text content
 *           example: Just finished this amazing audiobook!
 *         audiobook_id:
 *           type: integer
 *           description: Required when post_type is audiobook_review; optional otherwise
 *           example: 42
 *         post_type_id:
 *           type: integer
 *           description: Optional on create; defaults to discussion when omitted
 *           example: 2
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Allowed only when post_type is discussion; required for discussion posts
 *           example: Anyone else finish this ending confused?
 *         is_spoiler:
 *           type: boolean
 *           description: Optional; defaults to false when omitted
 *           example: false
 *
 *     UpdatePostRequest:
 *       type: object
 *       properties:
 *         is_spoiler:
 *           type: boolean
 *           example: true
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Allowed only for discussion posts; required non-empty when provided
 *           example: Updated discussion title
 *       description: At least one of is_spoiler or title must be provided
 *
 *     LikePostRequest:
 *       type: object
 *       properties:
 *         like_type:
 *           type: string
 *           maxLength: 20
 *           default: like
 *           example: like
 *
 *     LikePostResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             liked:
 *               type: boolean
 *               example: true
 *             like_type:
 *               type: string
 *               example: like
 *             like_count:
 *               type: integer
 *               example: 16
 *
 *     UnlikePostResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             liked:
 *               type: boolean
 *               example: false
 *             like_count:
 *               type: integer
 *               example: 15
 *
 *     PostLikeUser:
 *       type: object
 *       properties:
 *         user_name:
 *           type: string
 *           example: johndoe
 *         full_name:
 *           type: string
 *           example: John Doe
 *         image_url:
 *           type: string
 *           nullable: true
 *           example: https://cdn.kabbik.com/users/avatar.jpg
 *         like_type:
 *           type: string
 *           example: like
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-30T10:00:00.000Z"
 *
 *     PostLikesListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostLikeUser'
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
 *     CreateCommentRequest:
 *       type: object
 *       required:
 *         - comment
 *       properties:
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           example: Great post!
 *         parent_comment_id:
 *           type: integer
 *           description: Optional ID of parent comment for threaded replies
 *           example: 5
 *
 *     CreateCommentResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 12
 *             comment:
 *               type: string
 *               example: Great post!
 *             user_id:
 *               type: integer
 *               example: 5
 *             post_id:
 *               type: integer
 *               example: 1
 *             parent_comment_id:
 *               type: integer
 *               description: Present when the comment is a reply
 *               example: 5
 *
 *     CommentReply:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 13
 *         post_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 11
 *         parent_comment_id:
 *           type: integer
 *           example: 12
 *         comment:
 *           type: string
 *           example: Thanks!
 *         like_count:
 *           type: integer
 *           example: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         author:
 *           $ref: '#/components/schemas/PostAuthor'
 *
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 12
 *         post_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 10
 *         parent_comment_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         comment:
 *           type: string
 *           example: Great post!
 *         like_count:
 *           type: integer
 *           example: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         author:
 *           $ref: '#/components/schemas/PostAuthor'
 *         replies:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CommentReply'
 *
 *     CommentsListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *         total:
 *           type: integer
 *           description: Total top-level comments (replies are nested, not counted separately)
 *           example: 5
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 20
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
 *     SharePostRequest:
 *       type: object
 *       properties:
 *         share_channel:
 *           type: string
 *           maxLength: 50
 *           description: Optional channel name (e.g. whatsapp, facebook, copy_link)
 *           example: whatsapp
 *
 *     SharePostResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             share_count:
 *               type: integer
 *               example: 3
 *
 *     ShareCountResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             share_count:
 *               type: integer
 *               example: 3
 */

module.exports = {};
