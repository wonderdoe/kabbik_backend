const MyblModel = require("../data/models/mybl-model");
const S3Helper = require("../utils/s3-helper");
const S3HelperMybl = require("../utils/s3-helper-aws-mybl");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const { validationResult } = require("express-validator");
const multer = require("multer");
const coreUtils = require("../utils/core-utils");
const contentUtils = require("../utils/content-utils");
const Authvalidator = require("../validators/auth-validator");
require("dotenv").config();
const NodeCache = require("node-cache");
const GlobalTask = require("../utils/global-tasker");
const audiobookModel = require("../data/models/audiobook-model");
const cache = new NodeCache();
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");

class MyblController {
  userRecentAudiobookList = async (req, res) => {
    const combinedData = await MyblModel.userRecentAudiobookList(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  sendWebhook = async (req, res) => {
    const combinedData = await MyblModel.sendWebhook(req.body);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  getHomeDataAppFromCacheFree = async (req, res) => {
    try {
      const cachedData = cache.get("homeFree");
      GlobalTask.insertLogsToffeeOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetHomeDataAppFromCacheFree",
        endpoint: "/v4/toffee/home/free",
        forTask: "Home",
        source: "Toffee",
        platform: "App",
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      if (cachedData) {
        return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
      }

      const homeData = await MyblModel.getFreeHomeDataApp(req);
      if (!homeData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }

      cache.set("homeFree", homeData, 100);
      return ResponseUtils.respond(res, constants.HTTP_200, homeData);
    } catch (error) {
      console.error("getHomeDataAppFromCacheFree failed:", error);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  checkValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
  };

  getAppCastcrewAudiobookMybl = async (req, res) => {
        const data = await MyblModel.getAppCastcrewAudiobookMybl(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };
  getByCategoryApp = async (req, res) => {
    this.checkValidation(req);
    const data = await MyblModel.getByCategoryApp(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  seemoreCategoryWiseMybl = async (req, res) => {
    //this.checkValidation(req);
    const data = await MyblModel.seemoreCategoryWiseMybl(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAudiobookById = async (req, res) => {
    const data = await audiobookModel.findOneMybl(
      [req.params.id, req.query.user_id],
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

  createOrUpdateRating = async (req, res, next) => {
    const { rating, user_id: userId, review } = req.body;
    const data = await MyblModel.createOrUpdateRating(
      rating,
      review,
      parseInt(req.params.id),
      userId
    );
    if (!data || data <= 0) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: data > 0 ? true : false,
    });
  };

  myBlCallBackWeb = async (req, res) => {
    return ResponseUtils.respond(res, constants.HTTP_200, {
      "success": true,
      "message": "Successfully Received call back"
    });
  };


  myBlCallBack = async (req, res) => {
    const result = await MyblModel.myBlCallBack(req);
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, result);
  };


  postMyblSessionData = async (req, res, next) => {
    const data = await MyblModel.postMyblSessionData(req);
    if (!data || data <= 0) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: data > 0 ? true : false,
    });
  };

  getByIdNewReview = async (req, res) => {
    // console.log("hhhhhhhh")
    const data = await MyblModel.getByIdNewReview([req.query.id]);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getHomeDataAppFromCacheMybl = async (req, res) => {
    try {
      const cachedData = cache.get("homeMybl");
      GlobalTask.insertLogsToffeeOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "getHomeDataAppFromCacheMybl",
        endpoint: "/v4/mybl/home/",
        forTask: "Home",
        source: "Mybl",
        platform: "App",
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      if (cachedData) {
        return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
      }

      const homeData = await MyblModel.getHomeDataApp(req);
      if (!homeData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }

      cache.set("homeMybl", homeData, 300);
      return ResponseUtils.respond(res, constants.HTTP_200, homeData);
    } catch (error) {
      console.error("getHomeDataAppFromCacheMybl failed:", error);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getFreeHomeDataApp = async (req, res) => {
    try {
      const combinedData = await MyblModel.getFreeHomeDataApp(req);

      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }

      return combinedData;
    } catch (error) {
      console.error("getFreeHomeDataApp failed:", error);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
  getHomeDataApp = async (req, res) => {
    try {
      const combinedData = await MyblModel.getHomeDataApp(req);
      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }

      return combinedData;
    } catch (error) {
      console.error("getHomeDataApp failed:", error);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
  getHomeBannerList = async (req, res) => {
    const combinedData = await MyblModel.getHomeBannerList();
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  getHomeBannerListV2 = async (req, res) => {
    const combinedData = await MyblModel.getHomeBannerListV2();
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  getHomeTopBannerToffee = async (req, res) => {
    const combinedData = await MyblModel.getHomeTopBannerToffeeFromCache(
      req,
      res
    );
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };

  getAudiobookDetails = async (req, res) => {
            
        const data = await MyblModel.getAudiobookDetails(
      [req.params.id, req.params.userId],
      req,
      res
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

  generateDailyReport = async (req, res) => {
    const data = await MyblModel.generateDailyReport(req);

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getHomeBannerWeb = async (req, res) => {
    const combinedData = await MyblModel.getHomeBannerWeb(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  getIfPromoActive = async (req, res) => {
    const combinedData = await MyblModel.getIfPromoActive(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: combinedData,
    });
  };

  getActiveHomeAd = async (req, res) => {
    const combinedData = await MyblModel.getActiveHomeAd(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: combinedData,
    });
  };
  getEpisodeLimit = async (req, res) => {
    const combinedData = await MyblModel.getEpisodeLimit(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: combinedData,
    });
  };
  webGetPromoCodePageData = async (req, res) => {
    const combinedData = await MyblModel.webGetPromoCodePageData(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: combinedData,
    });
  };
  getPromoCode = async (req, res) => {
    const combinedData = await MyblModel.getPromoCode(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };

  seemoreCategoryWiseFree = async (req, res) => {
    // Get page and pageSize from query parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10000;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    GlobalTask.insertLogsToffeeOptional({
      USERID: req.currentUser ? req.currentUser.id : "",
      userAction: "SeeMoreCategoryWise",
      endpoint: "/v4/toffee/home/seemore/free?name=",
      forTask: "SeeMore",
      source: "Toffee",
      platform: "App",
      user_ip: req.user_ip,
    }).catch((error) => {
      console.error("Error:", error);
    });

    // Pass offset and pageSize to the model function
    const data = await MyblModel.seemoreCategoryWiseFree(
      req.query.name,
      offset,
      pageSize
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

  checkPromoCode = async (req, res) => {
                const combinedData = await MyblModel.checkPromoCode(
      req,
      req.query.user_id,
      req.query.promocode,
      req.query.for_package
    );
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  CornJobgetHomeDataApp = async () => {
    const combinedData = await MyblModel.CornJobgetHomeDataApp();
    if (!combinedData) {
      return "failed";
    }
    return "success";
  };

  catchLogError = async (req, res) => {
    const filepath = path.join(
      __dirname,
      "../../logs/mybl-middleware-logs.txt"
    );
    const date = moment
      .tz(new Date(), "Asia/Dhaka")
      .format("YYYY-MM-DD HH:mm:ss");
    fs.appendFile(
      filepath,
      `${JSON.stringify({
        error: req.body,
        createdAt: date,
      })}\n\n`,
      (error) => {
        if (error) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_500,
            constants.INTERNAL_SERVER_ERROR
          );
        }
      }
    );
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: true,
      message: "Log inserted to external file",
    });
  };
}

module.exports = new MyblController();
