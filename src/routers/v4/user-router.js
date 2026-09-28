const express = require('express');
const router = express.Router();
const cron = require("node-cron");
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const userControllerV4 = require('../../controllers/user-controller-v4');
//update user profile


router.post('/update-user-first-login', authorize, userControllerV4.updateUserFirstLogin);
router.post('/request-audiobook', authorize, userControllerV4.requestAudiobook);
router.post('/redeem', authorize, userControllerV4.redeem);
router.get('/generateRand', userControllerV4.generateRand);
router.post('/paymentMethodList', userControllerV4.paymentMethodList);
router.post('/paymentMethodListV2', userControllerV4.paymentMethodListV2);

router.post('/paymentMethodListV4', userControllerV4.paymentMethodListV4);


router.post('/paymentMethodListV3', userControllerV4.paymentMethodListV3);


router.post('/paymentMethodListWeb', userControllerV4.paymentMethodListWeb);
router.post('/continueWatching', userControllerV4.continueWatching);
router.get('/continueWatching', userControllerV4.getContinueWatching);


router.post('/continueWatchingWeb', userControllerV4.continueWatchingWeb);
router.get('/continueWatchingWeb', userControllerV4.getContinueWatchingWeb);
router.post('/continueWatchingAudiobookList', userControllerV4.continueWatchingAudiobookList);



router.post('/update-ios-subscription', userControllerV4.updateIosSubscription);
router.post('/update-googlepay-subscription', userControllerV4.updateGooglepaySubscription);
router.get('/show-global-payment-method', userControllerV4.showGlobalPaymentMethod);
router.post('/account-deletion-request', userControllerV4.accountDeletionRequest);
router.get('/isOpenSavoy', userControllerV4.isOpenSavoy);
// router.put('/update/withoutImage/:id', authorize, userController.updateUserWithoutImage);
// router.put('/update/withoutImagePhone/:id', authorize, userController.updateUserWithoutImagePhone);
// router.put('/update/from_payment/:id', authorize, userController.updateUserWhilePayment);


router.post('/bankCard', authorize, userControllerV4.bankCard);
router.post('/referCode', authorize, userControllerV4.referCode);
router.post('/membership', authorize, userControllerV4.membership);
router.post('/cardNumberSubmit', authorize, userControllerV4.cardNumberSubmit);
router.get('/user_earning', authorize, userControllerV4.getUserEarning);
router.post('/request-withdraw', authorize, userControllerV4.requestWithdraw);



//cron.schedule('0 5 1 * *', function () {
//    userControllerV4.calculateUserEarnings();
//}, {
//    scheduled: true,
//    timezone: "Asia/Dhaka" // Set timezone to Bangladesh Standard Time (BST)
//});




module.exports = router;
