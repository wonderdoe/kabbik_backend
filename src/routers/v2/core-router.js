const express = require('express');
const router = express.Router();
const CoreController = require('../../controllers/core-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizePublisher = require('../../middlewares/auth-publisher-middleware');

router.get('/home', authorize, CoreController.getAppCombinedData);

router.get('/faq', CoreController.getFaqContent);

router.get('/get-app-announcement', CoreController.getAnnouncement);

router.get('/get-app-notifications', CoreController.getAppNotifications);
router.get('/get-user-unread-notifications', CoreController.getAppUnreadNotificationCount);
router.post('/read-app-notification', CoreController.readAppNotification);


router.get('/premium', authorize, CoreController.getAppPremiumData);
router.get('/podcast', authorize, CoreController.getAppPodcastData);
router.get('/banner-image', CoreController.getBannerImages);
router.post('/search', authorize, CoreController.getSearch);
router.get('/popular-search', authorize, CoreController.getPopularSearchKeywords);
router.get('/publisher-home', authorizePublisher, CoreController.getAudiobookDataForPublisher);
router.post('/fb-data-deletion', CoreController.fbDataDeletion);
module.exports = router;
