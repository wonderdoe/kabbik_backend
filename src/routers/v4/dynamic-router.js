const express = require('express');
const DynamicController = require('../../controllers/dynamic-controller');
const router = express.Router();
const authorize = require('../../middlewares/auth-middleware');

router.get('/mybl/get-popular-audiobook', DynamicController.getPopularAudiobook);
router.post('/uploadStory', DynamicController.uploadStory);
router.post('/bookRequest', DynamicController.bookRequest);
router.get('', DynamicController.getAppAcademicData);
// router.post('/updateUser', DynamicController.updateUser);


module.exports = router;
