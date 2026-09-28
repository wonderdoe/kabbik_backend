const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeExternal = require('../../middlewares/auth-external-middleware');

router.get('/', authorizeAdmin, paymentController.getAll);
router.get('/getallDeleted', authorizeAdmin, paymentController.getAllDeleted);
router.get('/getbyId', authorizeAdmin, paymentController.getPaymentById);
router.post('/init', authorize, paymentController.init);
router.post('/verify', paymentController.verifyPayment);
router.post('/audiobookinsertapp', authorize, paymentController.audiobookInsertMobileApp);
router.post('/audiobookinsertweb', authorize, paymentController.audiobookInsertWeb);
router.post('/payment-callback', authorizeExternal, paymentController.paymentCallback);
router.put('/deleted', authorizeAdmin, paymentController.deleted);
router.put('/payment-update/:id', authorizeAdmin, paymentController.paymentUpdate);
router.delete('/parmanentDelete', authorizeAdmin, paymentController.deletePayment);

router.post('/create-bl-subscription', paymentController.createBlSubscription);

router.post('/create-bl-subscription-new', paymentController.createBlSubscriptionNew);

router.post('/verify-dcb-payment', paymentController.dcbConsentApi);
router.post('/unsubscribed-bl-dcb', paymentController.unsubscribedApiBLDcb);

router.post('/revenuecat-weekhook', paymentController.revenueCatWebhook);



//hello
module.exports = router;
