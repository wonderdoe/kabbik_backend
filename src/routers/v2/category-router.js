const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/category-controller');
const authorize = require('../../middlewares/auth-middleware');

router.get('/', authorize, CategoryController.getAllApp);
router.get('/suggestion', authorize, CategoryController.getAllAppSuggestion);

module.exports = router;
