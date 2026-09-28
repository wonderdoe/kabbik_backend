const express = require("express");
const router = express.Router();
const AudiobookController = require("../../controllers/audiobook-controller");
const authorize = require("../../middlewares/auth-middleware");
const authorizeNewAdmin = require("../../middlewares/auth-new-admin-middleware");
const EpisodeController = require("../../controllers/episode-controller");

router.get("/getallreview", authorize, AudiobookController.getByIdNewReview);
router.get(
  "/pendings-by-channelId/:id",
  authorize,
  AudiobookController.getPendingsByChannelId
);
router.get(
  "/approved-by-channelId/:id",
  authorize,
  AudiobookController.getApprovedByChannelId
);
router.get(
  "/rejected-by-channelId/:id",
  authorize,
  AudiobookController.getRejectedByChannelId
);
router.post("/upload-image-in-stack", AudiobookController.uploadBannerImage);

router.post("/", authorize, AudiobookController.createV3);
router.post("/crm", authorizeNewAdmin, AudiobookController.createV3);
router.post(
  "/with-episodes",
  authorize,
  AudiobookController.createWithEpisodesV3
);
router.post("/addEpisode", EpisodeController.createV3);

router.get("/dynamic/:id", authorize, AudiobookController.getByIdDynamic);
router.get("/episodes/:id/audio", authorize, AudiobookController.streamEpisode);
router.get("/:id", authorize, AudiobookController.getById);
router.get(
  "/purchased-audiobook/:id",
  authorize,
  AudiobookController.getAllPurchasedAudioBooks
);

//dev mosaraf
router.get("/single/:id", authorize, AudiobookController.getAudioById);
router.get("/secured/:id", authorize, AudiobookController.findSecuredAudiobook);
// api for finding a random audiobook of the specific category of current audiobook
router.get(
  "/autonext/:id",
  authorize,
  AudiobookController.getNextIdByCurrentId
);
router.get(
  "/suggestedAudiobooks/:id",
  authorize,
  AudiobookController.suggestedAudiobooks
);

router.post("/upload-with-bgm", AudiobookController.uploadAudiobookRefined);
router.put("/edit-with-bgm", AudiobookController.updateAudiobookRefined);

module.exports = router;
