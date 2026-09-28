const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const UserContributionModel = require('../data/models/user-contribution-model');
const PostController = require('./post-controller');

class UserContributionController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    return { page, pageSize };
  };

  getMyPosts = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const userId = req.currentUser.id;
      const filterResult = await PostController.resolvePostTypeFilter(req, res);
      if (filterResult.error) return undefined;

      const result = await UserContributionModel.findMyPosts(
        userId,
        page,
        pageSize,
        filterResult.postTypeId
      );
      result.data = await PostController.enrichPostsWithStats(result.data);

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

  getLikedPosts = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const userId = req.currentUser.id;

      const result = await UserContributionModel.findLikedPosts(userId, page, pageSize);
      result.data = await PostController.enrichPostsWithStats(result.data);

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

  getCommentedPosts = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const userId = req.currentUser.id;

      const result = await UserContributionModel.findCommentedPosts(userId, page, pageSize);
      result.data = await PostController.enrichPostsWithStats(result.data);

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
}

module.exports = new UserContributionController();
