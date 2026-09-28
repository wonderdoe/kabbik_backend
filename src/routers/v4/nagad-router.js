const express = require('express');
const router = express.Router();
const NagadController = require('../../controllers/nagad-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeExternal = require('../../middlewares/auth-external-middleware');


//create subscription
router.post('/create-payment', NagadController.createPayment);
router.get('/verify-payment', NagadController.verifyPayment);
router.get('/nagad-redirect', NagadController.getNagadRedirect);
router.post('/bkash-create-subscription-request', NagadController.bkashCreateSubscriptionRequest);
router.post('/bkash-create-subscription-request-app', NagadController.bkashCreateSubscriptionRequestApp);


//dev mosaraf
router.post('/create-payment-dynamic', NagadController.createDynamicPayment);



//hello
module.exports = router;
