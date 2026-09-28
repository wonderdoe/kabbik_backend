const express = require('express');
const userPreferenceController = require('../../controllers/userPreference-controller');
const router = express.Router();

 
 
router.post('/create', userPreferenceController.createUserPreference);
// router.post('/redirect-payment', CityPaymentController.redirectPayment);
router.post('/get-single', userPreferenceController.getUserWisePreferences);



module.exports = router;
