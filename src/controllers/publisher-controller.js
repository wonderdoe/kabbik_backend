const PublisherModel = require("../data/models/publisher-model");
const S3Helper = require("../utils/s3-helper");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const { validationResult } = require("express-validator");
const multer = require("multer");
const coreUtils = require("../utils/core-utils");
const contentUtils = require("../utils/content-utils");
const redisClient = require("../utils/redis-client");
require("dotenv").config();

const pubport = "pubport";
const publishersAudiobooks = "publishersAudiobooks";
const monthlyUniqueCount = "monthlyUniqueCount";
const audiobookWiseSummary = "audiobookWiseSummary";

class PublisherController {
  getAll = async (req, res) => {
    const data = await PublisherModel.getAll();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getBlockedPublisher = async (req, res) => {
    const data = await PublisherModel.getBlockedPublisher();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  updatePublisherStatus = async (req, res) => {
    const data = await PublisherModel.updatePublisherStatus(
      req.params.id,
      req.body.deletestatus
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersAudiobooks = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublishersAudiobooks(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersAudiobooksFromRedis = async (req, res) => {
    const key = `${pubport}:${publishersAudiobooks}:${req.query.publisherId}`;
    if (!(await redisClient.exists(key))) {
      return this.getPublishersAudiobooks(req, res);
    }
    const data = await PublisherModel.getPublishersAudiobooksFromRedis(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersById = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublishersById(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  updatePublishers = async (req, res) => {
    this.checkValidation(req);
    if (req.body.imageUrl == null) {
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
            "Unable to upload"
          );
        }
        // const {
        //     title, size, description,
        // } = req.body;

        const {
          email,
          phone,
          full_name: fullName,
          address,
          id,
          en_name,
        } = req.body;

        const result = await PublisherModel.updatePublisherById(
          email,
          phone,
          fullName,
          address,
          imageUrl,
          id,
          en_name
        );

        if (!result) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
        return ResponseUtils.respond(res, constants.HTTP_201, {
          data: "Success",
        });
      });
    } else {
      const {
        email,
        phone,
        full_name: fullName,
        address,
        id,
        imageUrl,
        en_name,
      } = req.body;

      const result = await PublisherModel.updatePublisherById(
        email,
        phone,
        fullName,
        address,
        imageUrl,
        id,
        en_name
      );
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        result: result,
      });
    }
  };

  getPublisherslist = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublisherslist(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getMonthWiseWholeSummary = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getMonthWiseWholeSummary(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAudiobookWiseWholeSummary = async (req, res) => {
    const data = await PublisherModel.getAudiobookWiseWholeSummary(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAudiobookWiseWholeSummaryFromRedis = async (req, res) => {
    const { publisherId, audiobookId } = req.query;
    const key = `${pubport}:${audiobookWiseSummary}:${publisherId},${audiobookId}`;
    if (!(await redisClient.exists(key))) {
      return this.getAudiobookWiseWholeSummary(req, res);
    }
    const data = await PublisherModel.getAudiobookWiseWholeSummaryFromRedis(
      req
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getMonthlyUniqueCount = async (req, res) => {
    const data = await PublisherModel.getMonthlyUniqueCount(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getMonthlyUniqueCountFromRedis = async (req, res) => {
    const key = `${pubport}:${monthlyUniqueCount}:${req.query.publisherId}`;
    if (!(await redisClient.exists(key))) {
      return this.getMonthlyUniqueCount(req, res);
    }
    const data = await PublisherModel.getMonthlyUniqueCountFromRedis(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getMonthlyUniqueUser = async (req, res) => {
    const data = await PublisherModel.getMonthlyUniqueUser(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersPaidUsersSummary = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublishersPaidUsersSummary(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersAudiobookSummaryToday = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublishersAudiobookSummaryToday(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPublishersAudiobookSummaryYesterday = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.getPublishersAudiobookSummaryYesterday(
      req
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  update = async (req, res) => {
    const data = await PublisherModel.update(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAdminPublishserId = async (req, res) => {
    let data = await PublisherModel.getAdminPublishserId(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    data.kabbik_percentage = 100 - data.percentage;
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  delete = async (req, res) => {
    this.checkValidation(req);
    const data = await PublisherModel.delete(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpException(400, "Validation faild", errors);
    }
  };

  setCronAudiobookSummary = async (req, res) => {
    const data = await PublisherModel.setCronAudiobookSummary(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getMonthlyRevenueByPublisher = async (req, res) => {
    const data = await PublisherModel.getMonthlyRevenueByPublisher(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getRevenue = async (req, res) => {
    const data = await PublisherModel.getRevenue(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  // Payments made to the authenticated publisher.
  // The publisher is resolved from the JWT, never from the query string, so a
  // publisher cannot read another publisher's payment history. A publisherId
  // param is accepted for client symmetry but must match the token's publisher.
  getPaymentHistory = async (req, res) => {
    const userId = req.jwtPayload && req.jwtPayload.user_id;
    const ownPublisherId = await PublisherModel.getPublisherIdByUserId(userId);
    if (!ownPublisherId) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }
    const { publisherId } = req.query;
    if (publisherId && Number(publisherId) !== Number(ownPublisherId)) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }
    const data = await PublisherModel.getPaymentHistory(ownPublisherId);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAudiobooksAnalyticsByPublisher = async (req, res) => {
    const data = await PublisherModel.getAudiobooksAnalyticsByPublisher(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getUserListenersSoFar = async (req, res) => {
    const data = await PublisherModel.getUserListenersSoFar(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getUserListeners = async (req, res) => {
    const data = await PublisherModel.getUserListeners(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
}

module.exports = new PublisherController();
