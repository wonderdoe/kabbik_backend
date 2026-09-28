const express = require('express');
const AcademicController = require('../../controllers/academic-controller');
const router = express.Router();
const authorize = require('../../middlewares/auth-middleware');

router.get('/get-story', AcademicController.getWriterStory);
router.post('/uploadStory', AcademicController.uploadStory);
router.post('/bookRequest', AcademicController.bookRequest);
router.get('', AcademicController.getAppAcademicData);
// router.post('/updateUser', AcademicController.updateUser);


module.exports = router;
