const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const BlogsModel = require('../data/models/blogs-model');
const BlogsValidator = require('../validators/blogs-validator');

class BlogsController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    return { page, pageSize };
  };

  getAll = async (req, res) => {
    try {
      const requestingUserId = req.currentUser ? req.currentUser.id : null;
      const data = await BlogsModel.findAll(req, requestingUserId);

      return ResponseUtils.respond(res, constants.HTTP_200, data);
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
      const blogId = parseInt(req.params.id, 10);
      const blog = await BlogsModel.findByIdWithStats(blogId);

      if (!blog) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const requestingUserId = req.currentUser ? req.currentUser.id : null;
      blog.myReaction = await BlogsModel.getUserReaction(blogId, requestingUserId);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: blog });
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
      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const result = await BlogsModel.upsertReaction(
        blogId,
        req.currentUser.id,
        BlogsModel.REACTION_LIKE
      );

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

  dislike = async (req, res) => {
    try {
      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const result = await BlogsModel.upsertReaction(
        blogId,
        req.currentUser.id,
        BlogsModel.REACTION_DISLIKE
      );

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

  removeReaction = async (req, res) => {
    try {
      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const result = await BlogsModel.removeReaction(blogId, req.currentUser.id);

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

  getReactions = async (req, res) => {
    try {
      await Promise.all(BlogsValidator.validateReactionsList().map((v) => v.run(req)));
      const validationError = BlogsValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { page, pageSize } = this.parsePagination(req);
      const typeFilter = req.query.type || null;
      const result = await BlogsModel.getReactions(blogId, page, pageSize, typeFilter);

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
      await Promise.all(BlogsValidator.validateComment().map((v) => v.run(req)));
      const validationError = BlogsValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { comment } = req.body;
      const result = await BlogsModel.addComment(blogId, req.currentUser.id, comment);

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
      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { page, pageSize } = this.parsePagination(req);
      const result = await BlogsModel.getComments(blogId, page, pageSize);

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
      await Promise.all(BlogsValidator.validateUpdateComment().map((v) => v.run(req)));
      const validationError = BlogsValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const commentId = parseInt(req.params.commentId, 10);
      const comment = await BlogsModel.getCommentById(commentId);

      if (!comment || comment.deleted === 1) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (comment.userId !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      await BlogsModel.updateComment(commentId, req.body.comment);

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
      const comment = await BlogsModel.getCommentById(commentId);

      if (!comment || comment.deleted === 1) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      if (comment.userId !== req.currentUser.id) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      await BlogsModel.softDeleteComment(commentId);

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
      await Promise.all(BlogsValidator.validateShare().map((v) => v.run(req)));
      const validationError = BlogsValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const blogId = parseInt(req.params.id, 10);
      const visible = await BlogsModel.isBlogVisible(blogId);
      if (!visible) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { share_channel: shareChannel } = req.body;
      const result = await BlogsModel.recordShare(blogId, req.currentUser.id, shareChannel);

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

module.exports = new BlogsController();
