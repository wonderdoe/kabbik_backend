const express = require('express');
const router = express.Router();
const CityPaymentController = require('../../controllers/city-payment-controller');

 
 
router.post('/create-payment', CityPaymentController.createPayment);
// router.post('/redirect-payment', CityPaymentController.redirectPayment);
router.post('/validate-payment', CityPaymentController.validatePayment);
router
  .route('/redirect-payment')
  .get(CityPaymentController.redirectPayment) // Handle GET requests
  .post(CityPaymentController.redirectPayment);

router.get('/transection-report', CityPaymentController.cityPayTransectionReport);


module.exports = router;
