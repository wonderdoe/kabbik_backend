const express = require('express');
const EmailNotificationController = require('../../controllers/EmailNotification-controller');
const router = express.Router();

router.post('/create-notification',EmailNotificationController.create);
router.get('/get-all-notification', EmailNotificationController.getAllEmail);

module.exports = router;
