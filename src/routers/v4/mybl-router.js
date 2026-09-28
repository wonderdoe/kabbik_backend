const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const MyblController = require("../../controllers/mybl-controller");
const authorize = require("../../middlewares/auth-middleware");
const myblModel = require("../../data/models/mybl-model");

// router.get('/user-recent-audiobook', authorize, ToffeeController.userRecentAudiobookList);
// router.get('/home', authorize, ToffeeController.getHomeDataAppFromCache);
// router.get('/home-banner-list', authorize, ToffeeController.getHomeBannerList);
// router.get('/home-banner-list-V2', authorize, ToffeeController.getHomeBannerListV2);

router.get("/getallreview", authorize, MyblController.getByIdNewReview);
router.post("/:id/ratings", authorize, MyblController.createOrUpdateRating);
router.get("/home", authorize, MyblController.getHomeDataAppFromCacheMybl);
router.post("/payment/send-webhook", authorize, MyblController.sendWebhook);
router.get("/home/free", authorize, MyblController.getHomeDataAppFromCacheFree);
router.get("/home/seemore", authorize, MyblController.seemoreCategoryWiseMybl);
router.get("/category/:id", authorize, MyblController.getByCategoryApp);

router.get(
  "/castcrew/castcrewaudiobook",
  MyblController.getAppCastcrewAudiobookMybl
);
router.get(
  "/home/seemore/free",
  authorize,
  MyblController.seemoreCategoryWiseFree
);
router.get(
  "/home/top-banner",
  authorize,
  MyblController.getHomeTopBannerToffee
);
router.post("/session", authorize, MyblController.postMyblSessionData);
//router.get("/payment-callback", MyblController.myBlCallBack);


router
  .route('/payment-callback')
  .get(MyblController.myBlCallBack) // Handle GET requests
  .post(MyblController.myBlCallBack);

 router
  .route('/payment-callback-web')
  .get(MyblController.myBlCallBackWeb) // Handle GET requests
  .post(MyblController.myBlCallBackWeb);


router.get(
  "/audiobook/:id/:userId",
  authorize,
  MyblController.getAudiobookDetails
);

router.post(
  "/generate-daily-report", 
  MyblController.generateDailyReport
);
// router.get('/getHomeBannerWeb', authorize, ToffeeController.getHomeBannerWeb);
// router.get('/getPromoCode', authorize, ToffeeController.getPromoCode);
// router.get('/checkPromoCode', authorize, ToffeeController.checkPromoCode);
// router.get('/getIfPromoActive', authorize, ToffeeController.getIfPromoActive);
// router.get('/getActiveHomeAd', ToffeeController.getActiveHomeAd);
// router.get('/getEpisodeLimit', ToffeeController.getEpisodeLimit);

router.get("/audiobook/:id", authorize, MyblController.getAudiobookById);

// router.get('/webGetPromoCodePageData', ToffeeController.webGetPromoCodePageData);

router.post("/catch-log-error", MyblController.catchLogError);

// Schedule a task to run every day at 4 PM
cron.schedule("5 0 * * *", function () {
  myblModel.generateDailyReportCorn();
});

// cron.schedule("*/30 * * * * *", function () {
//     ToffeeController.CornJobgetHomeDataApp()
// });

module.exports = router;
