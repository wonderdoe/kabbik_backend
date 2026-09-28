const express = require('express');
const continueBookStatusController = require('../../controllers/continueBookStatus-controller');
const router = express.Router();


 

// router.get('/course', AcademicController.getWriterStory);
router.post('/post-user-listen-data', continueBookStatusController.postBookListenStatus);
router.get('/get-user-continue-data/:userId', continueBookStatusController.getUserWiseContinueData);
router.get('/get-user-listen-history/:userId', continueBookStatusController.getUserWiseContinueData);
router.get('/user-book-completed-stats/:userId', continueBookStatusController.getBookCompletedData);
// router.post('/updateUser', AcademicController.updateUser);


module.exports = router;
