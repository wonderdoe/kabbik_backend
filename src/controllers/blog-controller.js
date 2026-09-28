const constants = require("../utils/constants");
const ResponseUtils = require("../utils/res-utils");
const BlogModel = require("../data/models/blog-model");

class BlogController {
  getAll = async (req, res) => {
    try {
      const userId = req.query.userId;
      const data = userId
        ? await BlogModel.getAllByUserId(userId)
        : await BlogModel.getAll(req);
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
      const data = await BlogModel.getById(req.params.id);
      return ResponseUtils.respond(res, constants.HTTP_200, { data });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getApprovedBySlug = async (req, res) => {
    try {
            const data = await BlogModel.getApprovedBySlug(req.params.slug);
      return ResponseUtils.respond(res, constants.HTTP_200, { data });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  create = async (req, res) => {
    try {
      const data = await BlogModel.create(req);
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

  update = async (req, res) => {
    try {
      const data = await BlogModel.getById(req.params.id);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      const result = await BlogModel.update(req);
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

  delete = async (req, res) => {
    try {
      const data = await BlogModel.getById(req.params.id);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      const result = await BlogModel.delete(req.params.id);
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

  toggle = async (req, res) => {
    try {
      const data = await BlogModel.getById(req.params.id);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      const result = await BlogModel.toggle(req.params.id);
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

module.exports = new BlogController();
