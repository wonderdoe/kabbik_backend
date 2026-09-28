const express = require('express');
const UpcomingController = require('../../controllers/upcoming-controller');
const WritestoryController = require('../../controllers/writestory-controller');
const router = express.Router();
const authorize = require('../../middlewares/auth-middleware');


router.post('/', authorize, UpcomingController.createUpcoming);
router.delete('/', authorize, UpcomingController.deleteUpcoming);
router.get('/', authorize, UpcomingController.getUpcoming);
// router.post('/updateUser', WritestoryController.updateUser);


module.exports = router;
