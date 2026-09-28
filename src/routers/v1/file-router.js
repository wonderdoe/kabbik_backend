const express = require('express');
const router = express.Router();
const FileController = require('../../controllers/file-controller');
const authorize = require('../../middlewares/auth-middleware');

router.post('/upload', authorize, FileController.upload);
router.get('/:name/stream', FileController.stream);

module.exports = router;
