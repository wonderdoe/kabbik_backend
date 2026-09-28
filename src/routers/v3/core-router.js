const express = require("express");
const cron = require("node-cron");
const router = express.Router();
const CoreControllerVersion2 = require("../../controllers/core-controller-v2");
const authorize = require("../../middlewares/auth-middleware");
const authorizePublisher = require("../../middlewares/auth-publisher-middleware");
const S3Helper = require("../../utils/s3-helper");

router.get("/home", authorize, CoreControllerVersion2.getCombinedData);
router.get(
  "/homeData",
  authorize,
  CoreControllerVersion2.getHomeCombinedDataApp
);
router.get(
  "/homeData-v2",
  authorize,
  CoreControllerVersion2.getHomeCombinedDataAppV2
);
router.get(
  "/getHomeBannerApp",
  authorize,
  CoreControllerVersion2.getHomeBannerApp
);
router.get("/appHome", authorize, CoreControllerVersion2.getAppCombinedData);
router.post("/fcm-token", CoreControllerVersion2.postFCMToken);
//router.post(
// "/post-custom-notifications",
// CoreControllerVersion2.postCustomNotifications
//);
// setInterval(function () {
//     console.log('here')
// }, 1000);
// cron.schedule("*/30 * * * *", function () {
//     CoreControllerVersion2.CornJobgetHomeCombinedDataApp()
// });

module.exports = router;
