const express = require("express");
const router = express.Router();
const BkashController = require("../../controllers/bkash-controller");
const authorize = require("../../middlewares/auth-middleware");
const authorizeAdmin = require("../../middlewares/auth-admin-middleware");
const authorizeExternal = require("../../middlewares/auth-external-middleware");

//create subscription
router.post(
  "/bkash-create-subscription-request",
  BkashController.bkashCreateSubscriptionRequest
);
router.post(
  "/bkash-create-subscription-request-app",
  BkashController.bkashCreateSubscriptionRequestApp
);
router.post(
  "/bkash-create-subscription-request-app-bkash-microsite",
  BkashController.bkashCreateSubscriptionRequestAppBkashMicrosite
);

//
router.get(
  "/bkash-query-subscription-requestid",
  BkashController.getBkashQuerySubscriptionRequest
);
router.get(
  "/bkash-get-payment-listby-subscriptionid",
  BkashController.getBkashPaymentListSubscriptionID
);
router.get(
  "/bkash-get-payment-info-by-paymentid",
  BkashController.getBkashPaymentInfoByPaymentID
);
router.get(
  "/bkash-query-by-subscription-id",
  BkashController.getBkashQueryBySubscriptionID
);
router.get(
  "/bkash-get-payment-schedule",
  BkashController.getBkashPaymentSchedule
);
router.get("/bkash-redirect", BkashController.getBkashRedirect);
router.get(
  "/bkash-redirect-bkash-microsite",
  BkashController.getBkashRedirectBkashMicrosite
);
router.get("/bkash-redirect-test", BkashController.getBkashRedirectTest);
router.get(
  "/bkash-redirect-bkashapp",
  BkashController.getBkashRedirectBkashApp
);

//Delete subscription
router.delete(
  "/bkash-cancel-subscription",
  BkashController.getBkashCancelSubscription
);
//Delete subscription
router.delete(
  "/bkash-cancel-subscription-app",
  authorize,
  BkashController.getBkashCancelSubscriptionApp
);

//Refund Payment
router.post("/bkash-refund-payment", BkashController.getBkashRefundPayment);

//Webhook Notification
// router.post('/webhook', BkashController.paymentBkashNotification);
router.post("/webhook", BkashController.paymentBkashNotification);
router.post("/webhook-test", BkashController.paymentBkashNotificationTest);
router.post(
  "/bkash-onetime-create-payment",
  BkashController.bkashOnetimeCreatePayment
);
router.post(
  "/bkash-onetime-create-payment-bkash-microsite",
  BkashController.bkashOnetimeCreatePaymentBkashMicrosite
);
router.get("/bkash-onetime-callback", BkashController.bkashOnetimeCallback);
router.get(
  "/bkash-onetime-callback-bkash-microsite",
  BkashController.bkashOnetimeCallbackBkashMicrosite
);



router.post('/bkash-create-subscription-request-mc', BkashController.bkashCreateMicrositeRecurringSubscription);
router.get('/bkash-redirect-mc', BkashController.getBkashRedirectMC);
router.post('/webhook-mc', BkashController.paymentBkashNotificationMC);
router.post('/bkash-refund-payment-mc', BkashController.getBkashRefundPayment_mc);
router.get('/bkash-get-mc-payment-listby-subscriptionid', BkashController.getMcBkashPaymentListSubscriptionID);


//new created-dev-mosaraf
router.get(
  "/bkash-onetime-audiobook-purchase-callback",
  BkashController.bkashOnetimeAudioBookPurchaseCallback
);
router.post(
  "/bkash-onetime-create-payment-audioBook-purchase",
  BkashController.bkashOnetimeCreatePaymentAudioBookPurchase
);

router.get(
  "/bkash-onetime-course-purchase-callback",
  BkashController.bkashOnetimeCoursePurchaseCallback
);
router.post(
  "/bkash-onetime-create-payment-course-purchase",
  BkashController.bkashOnetimeCreatePaymentCoursePurchase
);
router.post(
  "/bkash-ebook-fulfill-payment",
  BkashController.bkashEbookFulfillPayment
);

router.post("/bKash/auth", BkashController.bkashLogin);
router.post("/bKash/staging/auth", BkashController.bkashLoginStaging);

//For mohiuddin bhai
router.post("/webhookSandbox", BkashController.paymentBkashNotificationSandbox);
router.post(
  "/webhookProduction",
  BkashController.paymentBkashNotificationProduction
);

// author: Oyasiul Islam
// for notifying those users whose bkash payment is unsuccessful
router.get("/bkashNotify/:userId", BkashController.paymentNotifyUser);

//hello
module.exports = router;
