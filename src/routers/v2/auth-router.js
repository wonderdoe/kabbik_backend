const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth-controller');

router.post('/login', authController.loginNew);
router.post('/update-name', authController.updateName);
router.post('/login-google', authController.loginGoogleNew);
router.post('/login-apple', authController.loginAppleNew);
router.post('/login-google-flutter', authController.loginGoogleNewFlutter);

module.exports = router;
