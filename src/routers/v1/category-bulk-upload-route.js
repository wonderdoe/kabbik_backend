const CategoryController = require('../../controllers/category-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');

const categoryBulkUploadHandlers = [
  authorizeAdmin,
  CategoryController.bulkUploadCategoryRemap,
];

module.exports = {
  categoryBulkUploadHandlers,
};
