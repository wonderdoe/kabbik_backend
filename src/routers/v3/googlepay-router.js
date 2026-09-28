const express = require('express');
const router = express.Router();
const GooglepayController = require('../../controllers/googlepay-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorizeExternal = require('../../middlewares/auth-external-middleware');


router.post('/googlepay-create-purchase', GooglepayController.googlepayCreatePurchase);

router.get('/googlepay_subscription_list', GooglepayController.getGooglepaySubscriptionList);
router.post('/googlepay_subscription_list_v2', GooglepayController.getGooglepaySubscriptionListV2);
router.get('/googlepay_subscription_item', GooglepayController.getGooglepaySubscriptionItem);
router.get('/find_user_product_id', GooglepayController.findByUserProductID);
router.post('/googlepay_subscription_update_user', GooglepayController.googlepaySubscriptionUpdateUser);



//hello
module.exports = router;
