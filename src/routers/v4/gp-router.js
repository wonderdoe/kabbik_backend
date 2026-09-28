const express = require("express");
const router = express.Router();
const GpController = require("../../controllers/gp-controller");
const authGPMiddleware = require("../../middlewares/auth-gp-middleware");

router.post("/create-payment", GpController.createPayment);
router.get("/redirect-url/ok", GpController.redirectUrlOk);
router.get("/redirect-url-recharge/ok", GpController.redirectUrlRechargeOk);
router.get("/redirect-url/deny", GpController.redirectUrlDeny);
router.get("/redirect-url/error", GpController.redirectUrlError);
router.post("/refund-payment", GpController.refundPayment);
router.get("/unsubscribe", GpController.unsubscribe);
router.post("/unsubscribe", GpController.unsubscribeCallback);
router.get("/cronjob/renewal-charge", GpController.renewalCharge);
router.get("/cronjob/renewal-warning", GpController.renewalWarning);

module.exports = router;
