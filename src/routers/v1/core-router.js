const express = require('express');
const router = express.Router();
const TrackController = require('../../controllers/track-controller');
const authorize = require('../../middlewares/auth-middleware');

router.get('/home', authorize, TrackController.getCombinedData);
router.get('/for-app', authorize, TrackController.getCombinedDataForApp)
router.get('/quiz-report-sender-mail', TrackController.sendEmail);
router.post('/debugger', TrackController.debugger);
module.exports = router;
