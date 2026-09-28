const express = require('express');
const WritestoryController = require('../../controllers/writestory-controller');
const router = express.Router();
const authorize = require('../../middlewares/auth-middleware');

router.get('/get-story', authorize, WritestoryController.getWriterStory);
router.post('/uploadStory', WritestoryController.uploadStory);
router.post('/bookRequest', WritestoryController.bookRequest);
router.get('/getBookRequest', WritestoryController.getBookRequest);
// router.post('/updateUser', WritestoryController.updateUser);


module.exports = router;
