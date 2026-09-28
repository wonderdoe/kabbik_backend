const express = require('express');
const router = express.Router();
const CloudMessage = require('../../controllers/cloud-message');
const authorize = require('../../middlewares/auth-middleware');

router.post('/cloud-message', authorize, CloudMessage.generateCloudMessage);

module.exports = router;