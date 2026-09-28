const express = require('express');
const router = express.Router();
const AudiobookController = require('../../controllers/audiobook-controller');
const authorizePublisher = require('../../middlewares/auth-publisher-middleware');
const authorize = require('../../middlewares/auth-middleware');

router.post('/', authorize, AudiobookController.create);

//add throug RSS Feed
router.post('/add-from-rss-feed', authorize, AudiobookController.addFromRssFeed);

router.get('/category/:id', authorize, AudiobookController.getByCategoryApp);

router.get('/:id', authorize, AudiobookController.getByIdOld);
router.post('/with-episodes', authorize, AudiobookController.createWithEpisodes);
router.post('/:id/analytics/ratings', authorize, AudiobookController.createOrUpdateRating);
router.post('/:id/analytics/play-counts', authorize, AudiobookController.updatePlayCount);
router.post('/:id/analytics/play-counts-episode', authorize, AudiobookController.updatePlayCountEpisodes);
router.post('/:id/analytics/play-counts-mybl', authorize, AudiobookController.updatePlayCountMybl);
router.post('/:id/analytics/play-counts-episode-mybl', authorize, AudiobookController.updatePlayCountEpisodesMybl);
router.get('/:id/playlist', authorize, AudiobookController.getPlaylist);



router.post('/updateIsFree', AudiobookController.updateIsFree);

module.exports = router;
