const express = require("express");
const router = express.Router();
const GamezopTrackerController = require("../../controllers/gamezop-tracker-controller");

router.post("/gamezop-tracker", GamezopTrackerController.insertGamezopTraffic);
router.post("/gamezop-session-track", GamezopTrackerController.insertGamezopSessionTrack);

module.exports = router;
