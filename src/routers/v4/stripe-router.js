const express = require('express');
const router = express.Router();
const StripeController = require('../../controllers/stripe-controller');
const authorize = require('../../middlewares/auth-middleware'); 

//stripe intergation
router.post('/create-stripe-subscription', StripeController.createStripePayment);
router.get('/redirect-url-stripe', StripeController.redirectUrlStripe);
router.post('/manage-stripe-subscriptions', StripeController.manageSubscriptions);
router.post('/stripe-webhook', express.raw({ type: 'application/json' }),  StripeController.stripeWebhook);
router.post('/create-googlepay-stripe-subscription', StripeController.createGooglePayStripePayment);



module.exports = router;
