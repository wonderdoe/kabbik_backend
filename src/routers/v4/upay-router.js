const express = require('express');
const router = express.Router();
const UpayController = require('../../controllers/upay-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeExternal = require('../../middlewares/auth-external-middleware');


//create subscription
router.post('/create-payment', UpayController.createPayment);
router.get('/payment-auth', UpayController.paymentAuth);
router.get('/verify-payment', UpayController.verifyPayment);
router.get('/upay-redirect', UpayController.getUpayRedirect);
router.post('/bkash-create-subscription-request', UpayController.bkashCreateSubscriptionRequest);
router.post('/bkash-create-subscription-request-app', UpayController.bkashCreateSubscriptionRequestApp);



//hello
module.exports = router;
