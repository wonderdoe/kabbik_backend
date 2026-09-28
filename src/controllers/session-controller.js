const ResponseUtils = require("../utils/res-utils");
const SessionModel = require("../data/models/session-model");
const constants = require("../utils/constants");
const { millisecondsUntilEndOfDay } = require("../utils/session-utils");
const { validationResult } = require("express-validator");
const RedisModel = require("../data/models/redis-model");
const moment = require("moment-timezone");
const xlsx = require('xlsx');

require("dotenv").config();

class SessionController {
  init = async (req, res) => {
    const { data, key, setCookie } = await SessionModel.init(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return setCookie
      ? res
          .status(constants.HTTP_200)
          .cookie("redisSessionId", `${key}`, {
            httpOnly: true,
            expires: moment().add(1, "minutes").toDate(),
            sameSite: "none",
            secure: true,
          })
          .json(data)
      : res.status(constants.HTTP_200).json(data);
  };

  log = async (req, res) => {
    const { data, key } = await SessionModel.log(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return res
      .status(200)
      .cookie("redisSessionId", `${key}`, {
        httpOnly: true,
        expires: moment().add(1, "minutes").toDate(),
        sameSite: "none",
        secure: true,
      })
      .json(data);
  };

  initKabbik = async (req, res) => {
    const { data, key, setCookie } = await SessionModel.initKabbik(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return setCookie
      ? res
          .status(constants.HTTP_200)
          .cookie("redisSessionId", `${key}`, {
            httpOnly: true,
            expires: moment().add(1, "minutes").toDate(),
            sameSite: "none",
            secure: true,
          })
          .json({ ...data, redisKey: key })
      : res.status(constants.HTTP_200).json({ ...data });
  };


  dashboardDataCornjob = async () => {
    try {
      const data = await SessionModel.dashboardDataCornjob();
      return true;
    }
    catch (e) {

    }
  }



  logKabbik = async (req, res) => {
    const { data, key } = await SessionModel.logKabbik(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return res
      .status(200)
      .cookie("redisSessionId", `${key}`, {
        httpOnly: true,
        expires: moment().add(1, "minutes").toDate(),
        sameSite: "none",
        secure: true,
      })
      .json({ ...data, redisKey: key });
  };

  logKabbikApp = async (req, res) => {
    const { data, key } = await SessionModel.logKabbikApp(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return res
      .status(200)
      .cookie("redisSessionId", `${key}`, {
        httpOnly: true,
        expires: moment().add(1, "minutes").toDate(),
        sameSite: "none",
        secure: true,
      })
      .json({ ...data, redisKey: key });
  };

  cronjob = async (req, res) => {
    const data = await SessionModel.cronjob(req);
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


  sendMyBlDashboardNotifyMail = async () => {
     const data = await SessionModel.sendMyBlDashboardNotifyMail();
     return true;
  };


  insertBlReport = async (req, res) => {
    const data = await SessionModel.insertBlReport(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return res.status(200).json(data);
  };


  kabbikUserReportCron = async () => {
    await SessionModel.kabbikUserReport();
    return true;
  };


  searchUserStatsDateWise = async (req, res) => {
    const data = await SessionModel.searchUserStatsDateWise(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return res.status(200).json(data);
  };

  redisSync = async (req, res) => {
    try {
      const result = await RedisModel.redisSync();
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };

  kabbikSessionRedisSync = async (req, res) => {
    try {
      const result = await RedisModel.kabbikSessionRedisSync();
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };

  showAllKeys = async (req, res) => {
    try {
      const result = await RedisModel.showAllKeys(req);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };

  showKeysByPatternWithData = async (req, res) => {
    try {
      const result = await RedisModel.showKeysByPatternWithData(req);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        constants.NOT_FOUND
      );
    }
  };

  showKeysByPattern = async (req, res) => {
    try {
      const result = await RedisModel.showKeysByPattern(req);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };

  deleteKeysByPattern = async (req, res) => {
    try {
      const result = await RedisModel.deleteKeysByPattern(req);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };

  flushDb = async (req, res) => {
    try {
      const result = await RedisModel.flushDb(req);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
  };
}

module.exports = new SessionController();
