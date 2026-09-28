const HomeModel = require("../data/models/home-model");
const S3Helper = require("../utils/s3-helper");
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
const cache = new NodeCache();
const LoggerError = require("../utils/logger-error");

function normalizeNumericStrings(value) {
  if (typeof value === "string") {
    return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeNumericStrings(item));
  }

  if (value && typeof value === "object") {
    const normalized = {};
    Object.keys(value).forEach((key) => {
      normalized[key] = normalizeNumericStrings(value[key]);
    });
    return normalized;
  }

  return value;
}

function enrichHomeResponse(parsedHome) {
  parsedHome.gamezop = {
    showForSubscribers: true,
    showForFreeUsers: true,
  };
  parsedHome.quiz = {
    showForSubscribers: false,
    showForFreeUsers: false,
  };
  parsedHome.position = [
    "শীর্ষ ১০",
    "ট্রেন্ডিং",
    "নতুন",
    "ফ্রি",
  ];
  return parsedHome;
}

function logHomeCronOutcome(jobName, result) {
  if (!result) {
    console.error(`[home-cron:${jobName}] failed with no result`);
    return "failed";
  }
  if (result.ok === false) {
    console.error(`[home-cron:${jobName}] failed reason=${result.reason || "unknown"}`);
    return "failed";
  }
  console.log(
    `[home-cron:${jobName}] ${result.reason || "success"} sections=${result.sectionCount ?? "n/a"} duration=${result.durationMs ?? "n/a"}ms written=${result.written}`
  );
  return result.written === false ? "partial" : "success";
}

class HomeController {
  userRecentAudiobookList = async (req, res) => {
    const combinedData = await HomeModel.userRecentAudiobookList(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };
  getHomeDataAppFromCache = async (req, res) => {
    try {
      const cachedData = cache.get("home");

      if (cachedData) {
        const parsedHome = enrichHomeResponse(
          normalizeNumericStrings(cachedData)
        );
        return ResponseUtils.respond(res, constants.HTTP_200, parsedHome);
      }

      const homeData = await HomeModel.getHomeDataApp(req);
      if (!homeData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }

      const parsedHome = enrichHomeResponse(normalizeNumericStrings(homeData));
      cache.set("home", parsedHome, 100);
      return ResponseUtils.respond(res, constants.HTTP_200, parsedHome);
    } catch (error) {
      console.error("getHomeDataAppFromCache failed:", error);
      LoggerError.log(error);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };


  getHomeAuthorPublisher = async (req, res) => {
    
      var author_publisher = await HomeModel.getHomeAuthorPublisher(req, res);
      // cache.set("author_publisher", author_publisher, 100);

      if (!author_publisher) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, author_publisher);
  };


  getHomeDataApp = async (req, res) => {
    try {
      const combinedData = await HomeModel.getHomeDataApp(req);
      res.setHeader("Cache-Control", "public, max-age=300");
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
      LoggerError.log(error);
      if (res && !res.headersSent) {
        ResponseUtils.respondError(
          res,
          constants.HTTP_500,
          constants.INTERNAL_SERVER_ERROR
        );
      }
      return undefined;
    }
  };
  getHomeBannerList = async (req, res) => {
    const combinedData = await HomeModel.getHomeBannerList();
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };


  checkAppVersion = async (req, res) => {
    const combinedData = await HomeModel.checkAppVersion(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  }

  // add data into cache
  getHomeBannerListV2 = async (req, res) => {
    const cachedData = cache.get("homeBannerListV2");
    if (cachedData) {
      if (!cachedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
    } else {
      const combinedData = await HomeModel.getHomeBannerListV2();
      cache.set("homeBannerListV2", combinedData, 100);
      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
  };

  getHomeBannerApp = async (req, res) => {
    const cachedData = cache.get("getHomeBannerApp");

    if (cachedData) {
      if (!cachedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
    } else {
      const combinedData = await HomeModel.getHomeBannerApp(req.query.user_id);
      cache.set("getHomeBannerApp", combinedData, 100);

      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
  };

  getHomeBannerNew = async (req, res) => {
    const cachedData = cache.get("getHomeBannerNew");
    if (cachedData) {
      if (!cachedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
    } else {
      const combinedData = await HomeModel.getHomeBannerNew(req.query.user_id);
      cache.set("getHomeBannerNew", combinedData, 600);

      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
  };


  userProfileFeature = async (req, res) => {
    const combinedData = await HomeModel.userProfileFeature(req);
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


  getHomeBannerWeb = async (req, res) => {
  const cachedData = cache.get("getHomeBannerWeb");

    if (cachedData) {
      if (!cachedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
    } else {
      const combinedData = await HomeModel.getHomeBannerWeb(req.query.user_id);
      cache.set("getHomeBannerWeb", combinedData, 100);

      if (!combinedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
  };

  getIfPromoActive = async (req, res) => {
    const combinedData = await HomeModel.getIfPromoActive(req.query.user_id);
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
    const combinedData = await HomeModel.getActiveHomeAd(req.query.user_id);
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
    const combinedData = await HomeModel.getEpisodeLimit(req.query.user_id);
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
    const combinedData = await HomeModel.webGetPromoCodePageData(req);
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
    const combinedData = await HomeModel.getPromoCode(req.query.user_id);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };


  sponsorRequest = async (req, res) => {
    const combinedData = await HomeModel.sponsorRequest(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

     return  ResponseUtils.respond(res, constants.HTTP_200, combinedData);;
  };



  checkPromoCode = async (req, res) => {
    // console.log("rrrr");
    // console.log("req.query.promocode: " + req.query.promocode);
    // console.log(" req.query.for_package: " + req.query.for_package);
    const combinedData = await HomeModel.checkPromoCode(
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


 verifyRentPromoCode = async (req, res) => { 
    const combinedData = await HomeModel.verifyRentPromoCode(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };



  binVerify = async (req, res) => {
    const combinedData = await HomeModel.binVerify(req);

    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };

  //dev-mosaraf
  getDynamicPaymentMethod = async (req, res) => {
    const combinedData = await HomeModel.getDynamicPaymentMethod(req);

    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
  };

  truncateOtp = async () => {
    await HomeModel.truncateOtp();
    return true;
  }

  CornJobgetHomeDataApp = async () => {
    const processName = process.env.name || "primary-kabbik-backend";
    if (processName !== "primary-kabbik-backend") {
      console.log(`[home-cron:home] skipped on process ${processName}`);
      return "skipped";
    }
    const result = await HomeModel.CornJobgetHomeDataApp();
    return logHomeCronOutcome("home", result);
  };

  CornJobgetHomeDataMybl = async () => {
    const processName = process.env.name || "primary-kabbik-backend";
    if (processName !== "primary-kabbik-backend") {
      console.log(`[home-cron:mybl] skipped on process ${processName}`);
      return "skipped";
    }
    const result = await HomeModel.CornJobgetHomeDataMybl();
    return logHomeCronOutcome("mybl", result);
  };

  CornJobgetHomeDataAppHomeFree = async () => {
    const processName = process.env.name || "primary-kabbik-backend";
    if (processName !== "primary-kabbik-backend") {
      console.log(`[home-cron:free] skipped on process ${processName}`);
      return "skipped";
    }
    const result = await HomeModel.CornJobgetHomeDataAppHomeFree();
    return logHomeCronOutcome("free", result);
  };

  pushDataToRedis = async (req, res) => {
    const data = await HomeModel.pushDataToRedis(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      message: "data inserted to redis",
    });
  };


 insertAppUsageFeedback = async (req, res) => {
    const data = await HomeModel.insertAppUsageFeedback(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    } 

  return ResponseUtils.respond(res, constants.HTTP_200, {
      message: "Thanks for your valueable feedback. Please Leave us a Play Store review to show your support!",
    });

  };


  getDataFromRedis = async (req, res) => {
    const data = await HomeModel.getDataFromRedis(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
}

module.exports = new HomeController();
