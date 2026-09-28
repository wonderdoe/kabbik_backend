const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');

router.get('/user-purchase', authorize, userController.getForUserPurchase);
router.get('/get-by-ids', authorize, userController.getByIds);

//update user profile
router.delete('/delete',authorize, userController.softDelete);
router.put('/update/:id', authorize, userController.updateUser);
router.put('/update/withoutImage/:id', authorize, userController.updateUserWithoutImage);
router.put('/update/withoutImagePhone/:id', authorize, userController.updateUserWithoutImagePhone);
router.put('/update/from_payment/:id', authorize, userController.updateUserWhilePayment);
router.get('/:id', authorize, userController.getUserById);
router.get('/', authorizeAdmin, userController.getAllUsers);

module.exports = router;
