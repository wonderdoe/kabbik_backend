const express = require('express');
const router = express.Router();
const NagadController = require('../../controllers/robi-controller');
const cron = require("node-cron");


const authorize = require('../../middlewares/auth-middleware');

//create subscription
router.post('/create-payment',authorize, NagadController.createPayment);
// router.get('/verify-payment', NagadController.verifyPayment);
router.get('/robi-redirect', NagadController.getRobiRedirect);
router.post('/robi-unsubscribe',authorize, NagadController.unsubscribeRobi);
// router.post('/bkash-create-subscription-request', NagadController.bkashCreateSubscriptionRequest);
// router.post('/bkash-create-subscription-request-app', NagadController.bkashCreateSubscriptionRequestApp);


router.post('/renew-robi-subscription', NagadController.renewRobiSubscription);

//cron.schedule('0 14,22,6 * * *', function () {
//    NagadController.renewRobiSubscriptionCronJob();
//});

cron.schedule('30 16,23 * * *', function () {
    NagadController.renewRobiSubscriptionCronJob();
});


//hello
module.exports = router;
