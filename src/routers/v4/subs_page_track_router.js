const express = require('express');
const subs_page_track_controller = require('../../controllers/subs_page_track_controller');
const router = express.Router();

//stripe intergation
router.post('/create', subs_page_track_controller.postToSubsPageTrack);

module.exports = router;
