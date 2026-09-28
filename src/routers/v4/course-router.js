const express = require('express');
const router = express.Router();
const CourseController = require('../../controllers/course-controller');


 

// router.get('/course', AcademicController.getWriterStory);
router.post('/create-course', CourseController.createCourse);
router.get('/get-course/:id', CourseController.getCourseById);
router.get('/get-all-course', CourseController.getAllCourse);
router.get('/get-all-purchase-course/:id', CourseController.getPurchasedCourse);
// router.post('/updateUser', AcademicController.updateUser);


module.exports = router;
