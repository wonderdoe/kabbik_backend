const express = require('express');
const router = express.Router();
const ChannelController = require('../../controllers/channel-controller');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdminPublisher = require('../../middlewares/auth-admin-publisher-middleware');

router.get('/', authorizeAdmin, ChannelController.getAll)
router.post('/', authorize, ChannelController.create)
router.post('/create-for-admin',authorizeAdmin, ChannelController.createForAdmin)
router.get('/:id', authorize, ChannelController.getById)
router.get('/admin/channels', authorizeAdmin, ChannelController.getByAdminId)
router.put('/:id', authorize, ChannelController.update)
router.put('/:id/without-image', authorize, ChannelController.updateWithoutImage)
router.get('/admin/get-by-publisher', authorizeAdmin, ChannelController.getByPublisherId)

module.exports = router;
