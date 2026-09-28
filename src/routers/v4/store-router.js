const express = require('express');
const StoreController = require('../../controllers/store-controller');
const router = express.Router();
 
router.get('/get-store-item', StoreController.getStoreItem);

router.get('/get-all-store-item', StoreController.getAllStoreItem);

module.exports = router;
