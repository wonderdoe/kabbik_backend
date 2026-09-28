const express = require("express");
const router = express.Router();
const PushNotificationController = require("../../controllers/push-notification-controller");
const authorize = require("../../middlewares/auth-middleware");
const authorizeAdmin = require("../../middlewares/auth-admin-middleware");
const authorizeExternal = require("../../middlewares/auth-external-middleware");

//
router.post(
  "/gotoAuthorActivity",
  PushNotificationController.gotoAuthorActivity
);
router.post(
  "/gotoCastcrewActivity",
  PushNotificationController.gotoCastcrewActivity
);
router.post(
  "/gotoDetailsActivity",
  PushNotificationController.gotoDetailsActivity
);

router.post(
  "/send-notification-to-un-sub-user",
  PushNotificationController.nonSubscribeUserActivity
);


router.post( "/sheduled-onetime-notification", PushNotificationController.scheduledOnetimeNotification);
router.get( "/get-all-scheduled-notification", PushNotificationController.getAllScheduledNotification);
router.get( "/cancel-scheduled-notification", PushNotificationController.cancelScheduledNotification);

router.post( "/get-all-scheduled-notification", PushNotificationController.getAllScheduledNotificationNew);

router.post("/gotoQuizActivity", PushNotificationController.gotoQuizActivity);
router.post(
  "/gotoSubscriptionPage",
  PushNotificationController.gotoSubscriptionPage
);
router.post("/common", PushNotificationController.common);
//hello
module.exports = router;
