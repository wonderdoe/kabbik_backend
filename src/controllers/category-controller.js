const CategoryModel = require("../data/models/category-model");
const S3Helper = require("../utils/s3-helper");
const MulterHelper = require("../utils/multer-helper");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const { validationResult } = require("express-validator");
const multer = require("multer");
const coreUtils = require("../utils/core-utils");
const contentUtils = require("../utils/content-utils");
const LoggerError = require("../utils/logger-error");
const axios = require("axios");
const podcastFeedParser = require("podcast-feed-parser");
const ChannelModel = require("../data/models/channel-model");
const parseString = require("xml2js").parseString;
const { parseCategoryJson } = require("../services/categories/parseCategoryJson");
const {
  resolveCategoryLinks,
  getOldDataCounts,
} = require("../services/categories/resolve");
const {
  migrateCategoryRemap,
  MigrationVerificationError,
} = require("../services/categories/migrate");

require("dotenv").config();

const parseBooleanFlag = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

class PublisherController {
  getAll = async (req, res) => {
    const data = await CategoryModel.getAll(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
  getAllCategoriesAdmin = async (req, res) => {
    const data = await CategoryModel.getAllCategoriesAdmin();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllApp = async (req, res) => {
    const data = await CategoryModel.getAllApp();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  getAllAppSuggestion = async (req, res) => {
    const data = await CategoryModel.getAllAppSuggestion();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  createCategoryWithImage = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }

      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const { name } = req.body;
      const result = await CategoryModel.create(name, imageUrl);
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        id: result.last_id,
        image_file_url: imageUrl,
      });
    });
  };

  createCategoryWithOutImage = async (req, res) => {
    const { name } = req.body;
    let imageUrl = null;
    const result = await CategoryModel.create(name, imageUrl);
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_201, {
      success: result.affectedRows > 0 ? true : false,
    });
  };
  updateCategoryWithImage = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }

      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const id = req.query.id;
      const name = req.body.name;
      // sp with update query returns obj with affected rows
      const result = await CategoryModel.update(id, name, imageUrl);
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: result.affectedRows > 0 ? true : false,
      });
    });
  };
  updateCategoryWithOutImage = async (req, res) => {
    const id = req.query.id;
    const name = req.body.name;
    const imageUrl = null;
    // sp with update query returns obj with affected rows
    const result = await CategoryModel.update(id, name, imageUrl);
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: result.affectedRows > 0 ? true : false,
    });
  };
  delete = async (req, res) => {
    this.checkValidation(req);
    const data = await CategoryModel.delete(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  bulkUploadCategoryRemap = async (req, res) => {
    try {
      const dryRun = parseBooleanFlag(
        req.query.dryRun ?? req.body?.dryRun,
        true
      );
      const force = parseBooleanFlag(req.query.force ?? req.body?.force, false);

      const body =
        Array.isArray(req.body) || Array.isArray(req.body?.categories)
          ? req.body
          : req.body?.categories ?? req.body;

      const parsed = parseCategoryJson(body);
      if (!parsed.ok) {
        return res.status(parsed.status).json({
          success: false,
          message: parsed.message,
        });
      }

      const resolved = await resolveCategoryLinks(parsed.rows);
      const oldDataToClear = await getOldDataCounts();

      const hasBlockingIssues =
        parsed.parseErrors.length > 0 ||
        resolved.unmatchedAudiobooks.length > 0 ||
        resolved.resolveErrors.length > 0;

      if (!dryRun && hasBlockingIssues && !force) {
        return res.status(409).json({
          success: false,
          message:
            "Cannot commit: unresolved parse errors, unmatched audiobooks, or ambiguous categories. Re-run with dryRun=true to review, or force=true to override.",
          dryRun,
          parseErrors: parsed.parseErrors,
          unmatchedAudiobooks: resolved.unmatchedAudiobooks,
          resolveErrors: resolved.resolveErrors,
          oldDataToClear,
          committed: false,
        });
      }

      const migration = await migrateCategoryRemap(
        {
          ...resolved,
          distinctCategoryNames: parsed.distinctCategoryNames,
        },
        { dryRun, force }
      );

      return ResponseUtils.respond(res, constants.HTTP_200, {
        ...migration,
        parseErrors: parsed.parseErrors,
        oldDataToClear,
      });
    } catch (error) {
      LoggerError.log(error);
      if (error instanceof MigrationVerificationError) {
        return res.status(constants.HTTP_500).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      }
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        error.message || constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpException(400, "Validation faild", errors);
    }
  };
}

module.exports = new PublisherController();
