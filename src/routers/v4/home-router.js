const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const HomeController = require("../../controllers/home-controller");
const QuickAccessController = require("../../controllers/quick-access-controller");
const authorize = require("../../middlewares/auth-middleware");
const LoggerError = require("../../utils/logger-error");

const runHomeCronSafely = (jobName, fn) => {
  void fn().catch((err) => {
    console.error(`[home-cron:${jobName}] unhandled rejection:`, err);
    LoggerError.log(err);
  });
};

// Manual trigger for MyBL home cache rebuild (same job as the hourly cron at :10).
router.get("/cronjob/mybl", async (req, res) => {
  const result = await HomeController.CornJobgetHomeDataMybl();
  res.json({ success: true, result });
});
router.get(
  "/user-recent-audiobook",
  authorize,
  HomeController.userRecentAudiobookList
);
router.get("/author-publisher", authorize, HomeController.getHomeAuthorPublisher);
router.get("/home", authorize, HomeController.getHomeDataAppFromCache);
router.get("/quick-access", authorize, QuickAccessController.getForUser);

router.get("/home-banner-list", authorize, HomeController.getHomeBannerList);

router.post("/check-app-version", HomeController.checkAppVersion);

router.get(
  "/home-banner-list-V2",
  authorize,
  HomeController.getHomeBannerListV2
);
router.get("/getHomeBannerApp", authorize, HomeController.getHomeBannerApp);


router.get("/getHomeBannerNew", authorize, HomeController.getHomeBannerNew);

router.get("/getHomeBannerWeb", authorize, HomeController.getHomeBannerWeb);
router.get("/getPromoCode", authorize, HomeController.getPromoCode);

router.post("/sponsor-request", authorize, HomeController.sponsorRequest);


router.get("/checkPromoCode", authorize, HomeController.checkPromoCode);
router.post("/verify_rent_promocode",  HomeController.verifyRentPromoCode);
router.post("/binVerify", authorize, HomeController.binVerify);

router.get("/profile-feature", HomeController.userProfileFeature);


//dynamic payment method list
router.get(
  "/get-dynamic-payment-method",
  HomeController.getDynamicPaymentMethod
);

router.get("/getIfPromoActive", authorize, HomeController.getIfPromoActive);
router.get("/getActiveHomeAd", HomeController.getActiveHomeAd);
router.get("/getEpisodeLimit", HomeController.getEpisodeLimit);

router.get("/webGetPromoCodePageData", HomeController.webGetPromoCodePageData);

router.get("/get-data-from-redis", HomeController.getDataFromRedis);
router.post("/push-data-to-redis", HomeController.pushDataToRedis);
router.post("/post_app_usage_feedbak", HomeController.insertAppUsageFeedback);



cron.schedule('0 4 1 * *', function () {
   HomeController.truncateOtp();
 });

 cron.schedule("0 * * * *", function () {
  runHomeCronSafely("home", () => HomeController.CornJobgetHomeDataApp());
});

cron.schedule("10 * * * *", function () {
  runHomeCronSafely("mybl", () => HomeController.CornJobgetHomeDataMybl());
});

cron.schedule("20 * * * *", function () {
  runHomeCronSafely("free", () => HomeController.CornJobgetHomeDataAppHomeFree());
});

module.exports = router;
