const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/category-controller');
const authorize = require('../../middlewares/auth-middleware');
const {
  categoryBulkUploadHandlers,
} = require('./category-bulk-upload-route');

router.get('/', authorize, CategoryController.getAll);
router.get('/admin', authorize, CategoryController.getAllCategoriesAdmin);
router.post('/admin/bulk-upload', ...categoryBulkUploadHandlers);

router.post('/add/with-image', authorize, CategoryController.createCategoryWithImage);
router.post('/add/with-out-image', authorize, CategoryController.createCategoryWithOutImage);

router.put('/update/with-image', authorize, CategoryController.updateCategoryWithImage);
router.put('/update/with-out-image', authorize, CategoryController.updateCategoryWithOutImage);

module.exports = router;
