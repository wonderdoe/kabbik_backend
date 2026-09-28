const express = require('express');
const router = express.Router();
const TrackController = require('../../controllers/track-controller');
const authorize = require('../../middlewares/auth-middleware');

router.post('/', authorize, TrackController.createTrack);
router.get('/playlist', authorize, TrackController.getPlaylist);
router.get('/:id', authorize, TrackController.getById);
router.post('/temp/create', authorize, TrackController.createTrackTemp);
router.post('/files/update', authorize, TrackController.updateTrackFiles);
router.post('/test', TrackController.testPost);

module.exports = router;
