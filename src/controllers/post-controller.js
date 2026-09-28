const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const PostModel = require('../data/models/post-model');
const PostTypeModel = require('../data/models/post-type-model');
const PostValidator = require('../validators/post-validator');
const {
  getPostStats,
  getPostStatsBatch,
  setPostStats,
  setPostStatsBatch,
} = require('../utils/post-stats-cache-utils');
const { recomputeTrendingScores } = require('../utils/post-trending-utils');

const PRIMARY_PROCESS_NAME = 'primary-kabbik-backend';

class PostController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    return { page, pageSize };
  };

  parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null) return defaultValue;
    return value === true || value === 1;
  };

  resolvePostTypeFilter = async (req, res) => {
    const slug = req.query.post_type;
    if (!slug) {
      return { postTypeId: null };
    }

    const postType = await PostTypeModel.findActiveBySlug(slug);
    if (!postType) {
      ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        'Invalid post type filter',
        'INVALID_POST_TYPE_FILTER'
      );
      return { error: true };
    }

    return { postTypeId: postType.id };
  };

  resolveSortFilter = (req, res) => {
    const sort = req.query.sort;
    if (!sort || sort === 'recent') {
      return { sort: 'recent' };
    }

    if (sort === 'trending') {
      return { sort: 'trending' };
    }

    ResponseUtils.respondError(
      res,
      constants.HTTP_400,
      'Invalid sort value',
      'INVALID_SORT'
    );
    return { error: true };
  };

  resolvePostTypeForCreate = async (req, res) => {
    const { post_type_id: postTypeIdInput } = req.body;
    let postType;

    if (postTypeIdInput !== undefined && postTypeIdInput !== null) {
      postType = await PostTypeModel.findActiveById(postTypeIdInput);
    } else {
      postType = await PostTypeModel.findActiveBySlug('discussion');
    }

    if (!postType) {
      ResponseUtils.respondError(
        res,
        constants.HTTP_422,
        'Selected post type is invalid or inactive.',
        'INVALID_POST_TYPE'
      );
      return { error: true };
    }

    return { postType };
  };

  mergeStatsIntoPost = (post, stats) => {
    if (!post) return post;
    if (!stats) return post;
    return {
      ...post,
      like_count: stats.like_count,
      comment_count: stats.comment_count,
      share_count: stats.share_count,
    };
  };

  enrichPostsWithStats = async (posts) => {
    if (!posts || posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);
    const { hits, misses } = await getPostStatsBatch(postIds);

    const cacheWrites = [];

    for (const postId of misses) {
      const dbStats = await PostModel.getStatsFromDb(postId);
      if (dbStats) {
        hits.set(postId, dbStats);
        cacheWrites.push({ postId, stats: dbStats });
      }
    }

    if (cacheWrites.length > 0) {
      await setPostStatsBatch(cacheWrites);
    }

    return posts.map((post) =>
      this.mergeStatsIntoPost(post, hits.get(post.id))
    );
  };

  enrichPostWithStats = async (post) => {
    if (!post) return post;

    let stats = await getPostStats(post.id);
    if (!stats) {
      stats = await PostModel.getStatsFromDb(post.id);
      if (stats) {
        await setPostStats(post.id, stats);
      }
    }

    return this.mergeStatsIntoPost(post, stats);
  };

  create = async (req, res) => {
    try {
      await Promise.all(PostValidator.validateCreatePost().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const typeResult = await this.resolvePostTypeForCreate(req, res);
      if (typeResult.error) return undefined;

      const { content, audiobook_id: audiobookId, post_type_id: postTypeIdInput } = req.body;
      const userId = req.currentUser.id;
      const isSpoiler = this.parseBoolean(req.body.is_spoiler, false);
      const title = req.body.title !== undefined && req.body.title !== null
        ? String(req.body.title).trim()
        : null;

      if (postTypeIdInput === undefined || postTypeIdInput === null) {
        console.log('[posts] default post_type_id applied', {
          userId,
          resolvedType: 'discussion',
        });
      }

      if (typeResult.postType.slug !== 'discussion') {
        if (req.body.title !== undefined && req.body.title !== null) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_422,
            'title is only allowed for Discussion posts.',
            'TITLE_NOT_ALLOWED'
          );
        }
      } else if (!title) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_422,
          'title is required for Discussion posts.',
          'TITLE_REQUIRED'
        );
      }

      const resolvedTitle = typeResult.postType.slug === 'discussion' ? title : null;

      const normalizedAudiobookId =
        audiobookId === undefined || audiobookId === null || audiobookId === ''
          ? null
          : audiobookId;

      if (typeResult.postType.slug === 'audiobook_review' && !normalizedAudiobookId) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_422,
          'audiobook_id is required for Audio Book Review posts.',
          'AUDIOBOOK_ID_REQUIRED'
        );
      }

      const result = await PostModel.create(
        userId,
        content,
        normalizedAudiobookId,
        typeResult.postType.id,
        isSpoiler,
        resolvedTitle
      );
      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_404, result.error);
      }

      const post = await PostModel.findById(result.id);
      const enriched = await this.enrichPostWithStats(post);

      return ResponseUtils.respond(res, constants.HTTP_201, { data: enriched });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getAll = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const filterResult = await this.resolvePostTypeFilter(req, res);
      if (filterResult.error) return undefined;

      const sortResult = this.resolveSortFilter(req, res);
      if (sortResult.error) return undefined;

      const requestingUserId = req.currentUser ? req.currentUser.id : null;
      const result = await PostModel.findAll(
        page,
        pageSize,
        requestingUserId,
        filterResult.postTypeId,
        sortResult.sort
      );
      result.data = await this.enrichPostsWithStats(result.data);

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getByUserId = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const filterResult = await this.resolvePostTypeFilter(req, res);
      if (filterResult.error) return undefined;

      const userId = parseInt(req.params.userId, 10);
      const requestingUserId = req.currentUser ? req.currentUser.id : null;

      const result = await PostModel.findByUserId(
        userId,
        page,
        pageSize,
        requestingUserId,
        filterResult.postTypeId
      );
      result.data = await this.enrichPostsWithStats(result.data);

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getById = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.findById(postId);

      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const enriched = await this.enrichPostWithStats(post);
      const requestingUserId = req.currentUser ? req.currentUser.id : null;
      enriched.is_liked_by_me = await PostModel.isLikedByUser(postId, requestingUserId);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: enriched });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  delete = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);

      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (post.user_id !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      await PostModel.softDelete(postId);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  update = async (req, res) => {
    try {
      const ALLOWED = new Set(['is_spoiler', 'title']);
      const disallowed = Object.keys(req.body).filter((k) => !ALLOWED.has(k));
      if (disallowed.length > 0) {
        const field = disallowed[0];
        const msg = field === 'audiobook_id'
          ? 'audiobook_id cannot be changed after creation.'
          : `${field} cannot be changed after creation.`;
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          msg,
          'IMMUTABLE_FIELD'
        );
      }

      await Promise.all(PostValidator.validateUpdatePost().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);

      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (post.user_id !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      const updates = {};
      if (req.body.is_spoiler !== undefined) {
        updates.isSpoiler = this.parseBoolean(req.body.is_spoiler);
      }
      if (req.body.title !== undefined) {
        const postType = await PostTypeModel.findActiveById(post.post_type_id);
        if (postType?.slug !== 'discussion') {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_422,
            'title is only allowed for Discussion posts.',
            'TITLE_NOT_ALLOWED'
          );
        }
        const trimmedTitle = String(req.body.title).trim();
        if (!trimmedTitle) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_422,
            'title is required for Discussion posts.',
            'TITLE_REQUIRED'
          );
        }
        updates.title = trimmedTitle;
      }

      await PostModel.updatePost(postId, updates);

      const updatedPost = await PostModel.findById(postId);
      const enriched = await this.enrichPostWithStats(updatedPost);
      enriched.is_liked_by_me = await PostModel.isLikedByUser(postId, req.currentUser.id);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: enriched });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  like = async (req, res) => {
    try {
      await Promise.all(PostValidator.validateLike().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const likeType = req.body.like_type || 'like';
      const result = await PostModel.likePost(postId, req.currentUser.id, likeType);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  unlike = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const result = await PostModel.unlikePost(postId, req.currentUser.id);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getLikes = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { page, pageSize } = this.parsePagination(req);
      const result = await PostModel.getLikes(postId, page, pageSize);

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  addComment = async (req, res) => {
    try {
      await Promise.all(PostValidator.validateComment().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { comment, parent_comment_id: parentCommentId } = req.body;
      const result = await PostModel.addComment(
        postId,
        req.currentUser.id,
        comment,
        parentCommentId
      );

      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_400, result.error);
      }

      return ResponseUtils.respond(res, constants.HTTP_201, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getComments = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { page, pageSize } = this.parsePagination(req);
      const result = await PostModel.getComments(postId, page, pageSize);

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  updateComment = async (req, res) => {
    try {
      await Promise.all(PostValidator.validateUpdateComment().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const commentId = parseInt(req.params.commentId, 10);
      const comment = await PostModel.getCommentById(commentId);

      if (!comment || comment.deleted === 1) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (comment.user_id !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      await PostModel.updateComment(commentId, req.body.comment);

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Comment updated successfully',
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  deleteComment = async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      const comment = await PostModel.getCommentById(commentId);

      if (!comment || comment.deleted === 1) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (comment.user_id !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      await PostModel.softDeleteComment(commentId);

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  share = async (req, res) => {
    try {
      await Promise.all(PostValidator.validateShare().map((v) => v.run(req)));
      const validationError = PostValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const postId = parseInt(req.params.id, 10);
      const post = await PostModel.getRawPost(postId);
      if (!post) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { share_channel: shareChannel } = req.body;
      const result = await PostModel.recordShare(postId, req.currentUser.id, shareChannel);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getShareCount = async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const result = await PostModel.getShareCount(postId);

      if (!result) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      let stats = await getPostStats(postId);
      if (!stats) {
        stats = await PostModel.getStatsFromDb(postId);
        if (stats) {
          await setPostStats(postId, stats);
        }
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: { share_count: stats ? stats.share_count : result.share_count },
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  runScheduledTrendingRecompute = async ({ requirePrimary = true } = {}) => {
    if (requirePrimary) {
      const processName = process.env.name || PRIMARY_PROCESS_NAME;
      if (processName !== PRIMARY_PROCESS_NAME) {
        console.log(`[post-cron:trending] skipped reason=non_primary process=${processName}`);
        return { skipped: true, reason: 'non_primary', affectedRows: 0 };
      }
    }

    return recomputeTrendingScores();
  };

  recomputeTrendingScoresHandler = async (req, res) => {
    try {
      const result = await this.runScheduledTrendingRecompute({ requirePrimary: false });
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
}

module.exports = new PostController();
