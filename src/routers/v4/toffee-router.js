const express = require('express');
const router = express.Router();
const cron = require("node-cron");
const ToffeeController = require('../../controllers/toffee-controller');
const authorize = require('../../middlewares/auth-middleware');

// router.get('/user-recent-audiobook', authorize, ToffeeController.userRecentAudiobookList);
// router.get('/home', authorize, ToffeeController.getHomeDataAppFromCache);
// router.get('/home-banner-list', authorize, ToffeeController.getHomeBannerList);
// router.get('/home-banner-list-V2', authorize, ToffeeController.getHomeBannerListV2);

router.get('/home/free', authorize, ToffeeController.getHomeDataAppFromCacheFree);
router.get('/home/seemore/free', authorize, ToffeeController.seemoreCategoryWiseFree);
router.get('/home/top-banner', authorize, ToffeeController.getHomeTopBannerToffee);
router.get('/audiobook/:id/:userId', authorize, ToffeeController.getAudiobookDetails);
// router.get('/getHomeBannerWeb', authorize, ToffeeController.getHomeBannerWeb);
// router.get('/getPromoCode', authorize, ToffeeController.getPromoCode);
// router.get('/checkPromoCode', authorize, ToffeeController.checkPromoCode);
// router.get('/getIfPromoActive', authorize, ToffeeController.getIfPromoActive);
// router.get('/getActiveHomeAd', ToffeeController.getActiveHomeAd);
// router.get('/getEpisodeLimit', ToffeeController.getEpisodeLimit);



// router.get('/webGetPromoCodePageData', ToffeeController.webGetPromoCodePageData);



// cron.schedule("*/30 * * * * *", function () {
//     ToffeeController.CornJobgetHomeDataApp()
// });

module.exports = router;
