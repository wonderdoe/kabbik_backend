const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/admin-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');

router.get('/:id', authorizeAdmin, AdminController.getById);
router.patch('/:id', authorizeAdmin, AdminController.updateUser);

module.exports = router;
