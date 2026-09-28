const HttpException = require("../utils/httpexception-utils");
const { validationResult } = require("express-validator");
const ResponseUtils = require("../utils/res-utils");
const PushNotificationModel = require("../data/models/push-notification-model");
const constants = require("../utils/constants");

const S3Helper = require("../utils/s3-helper");
const axios = require("axios").default;
const dotenv = require("dotenv");
dotenv.config();

const moment = require("moment");
const cron = require("node-cron");
const DB = require("../data/db");

class PushNotificationController {
  gotoAuthorActivity = async (req, res) => {
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

      req.body.imageUrl = imageUrl;
      const data = await PushNotificationModel.gotoAuthorActivity(req);
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
      // const {
      //     title,
      //     size,
      //     description,
      // } = req.body;
      // const result = await AudiobookModel.uploadBannerImage(title, imageUrl, size, description, 0);
      // console.log(result);
      // if (!result) {
      //     return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
      // }
      // return ResponseUtils.respond(
      //     res,
      //     constants.HTTP_201, {
      //         id: result.last_id,
      //         image_file_url: imageUrl
      //     }
      // );
    });
  };
  gotoCastcrewActivity = async (req, res) => {
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

      req.body.imageUrl = imageUrl;

      const data = await PushNotificationModel.gotoCastcrewActivity(req);
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
    });
  };
  gotoDetailsActivity = async (req, res) => {
    const sql = "INSERT INTO notification_log(name, body, type) VALUES (?, ?, ?);";
    await DB.query(sql, [req.body.title, JSON.stringify(req.body), "gotoDetailsActivity"]);
    const data = await PushNotificationModel.gotoDetailsActivity(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  nonSubscribeUserActivity = async (req, res) => {

    const sql = "INSERT INTO notification_log(name, body, type) VALUES (?, ?, ?);";
    await DB.query(sql, [req.body.title, JSON.stringify(req.body), "nonSubscribeUserActivity"]);

    const data = await PushNotificationModel.nonSubscribeUserActivity(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  gotoQuizActivity = async (req, res) => {
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

      req.body.imageUrl = imageUrl;

      const data = await PushNotificationModel.gotoQuizActivity(req);
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
    });
  };
  common = async (req, res) => {
    const data = await PushNotificationModel.common(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  gotoSubscriptionPage = async (req, res) => {
    const data = await PushNotificationModel.gotoSubscriptionPage(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };


  scheduledOnetimeNotification = async (req, res) => {
    const data = await PushNotificationModel.scheduledAwsOnetimeNotification(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

 

  getAllScheduledNotification = async (req, res) => {
    const data = await PushNotificationModel.listAllSchedules(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data:data[0], nextToken:data[1] });
  };  


  getAllScheduledNotificationNew = async (req, res) => {
    const data = await PushNotificationModel.listAllSchedulesNew(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data:data[0], nextToken:data[1] });
  };  



  cancelScheduledNotification = async (req, res) => {
    const data = await PushNotificationModel.cancelScheduledNotification(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };



}

module.exports = new PushNotificationController();
