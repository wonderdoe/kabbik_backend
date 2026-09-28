const express = require('express');
const router = express.Router();
 const authorize = require('../../middlewares/auth-middleware');
const AmrpayController = require('../../controllers/amrpay-controller');




router.post('/create-payment-amrpay', AmrpayController.createPaymentAmrpay);
router.post('/redirect-url-amrpay', AmrpayController.successRedirectAmrpay);







module.exports = router;
