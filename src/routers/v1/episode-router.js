const express = require("express");
const router = express.Router();
const EpisodeController = require("../../controllers/episode-controller");
const authorizeAdmin = require("../../middlewares/auth-admin-middleware");
const authorizePublisher = require("../../middlewares/auth-publisher-middleware");
const authorize = require("../../middlewares/auth-middleware");

router.get("/", EpisodeController.getAllBYAudiobookId);
router.post("/", EpisodeController.create);
//update Episode
router.put("/update", authorize, EpisodeController.updateWithFile);
router.put(
  "/update/with-out-file",
  authorize,
  EpisodeController.updateWithoutFile
);
// router.post("/add-with-bgm", authorize, EpisodeController.addEpisodes);
router.post("/add-with-bgm", EpisodeController.addEpisodes);
router.get("/signed-url", authorize, EpisodeController.getSignedUrl);

module.exports = router;
