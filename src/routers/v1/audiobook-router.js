const express = require('express');
const router = express.Router();
const AudiobookController = require('../../controllers/audiobook-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
router.get('/', authorizeAdmin, AudiobookController.getAll);
router.get('/allbook-with-rect-banner', AudiobookController.getAllWithRectBanner);
router.get('/all-by-channel-id', authorize, AudiobookController.getAllByChannelId); //for admin
router.post('/:id/ratings', authorize, AudiobookController.createOrUpdateRating);
router.post('/:id/play-count', authorize, AudiobookController.updatePlayCount);
//get user purchased audiobook

router.get('/user-purchased', authorize, AudiobookController.getUserPurchased);


//get category wise, free and premium
router.get('/category/:id', authorize, AudiobookController.getByCategory);
router.get('/free-audiobooks', authorize, AudiobookController.getFree);
router.get('/premium-audiobooks', authorize, AudiobookController.getPremium);
router.get('/podcast-audiobooks', authorize, AudiobookController.getPodcast);
router.get('/authors', authorize, AudiobookController.getAuthorDetails);
router.get('/authors/authorepisodes', authorize, AudiobookController.getAppAuthorDataEpisodes);



//castcrew
router.get('/castcrew', AudiobookController.getCastcrewDetails);
router.get('/castcrew/castcrewaudiobook', AudiobookController.getAppCastcrewAudiobook);
router.get('/castcrew/getall', AudiobookController.getAllCastCrew);
router.get('/castcrew/findById', AudiobookController.findCastCrewById);
router.post('/castcrew/updateCastCrewById', AudiobookController.updateCastCrewById);
router.post('/castcrew/addCastCrew', AudiobookController.addCastCrew);

router.get('/authors/getall', AudiobookController.getAllAuthors);
router.get('/authors/findById', AudiobookController.findAuthorsById);
router.post('/authors/updateAuthorsById', AudiobookController.updateAuthorsById);
router.post('/authors/addAuthors', AudiobookController.addAuthors);



//get Seemore Audiobooks
router.get('/home/seemore', authorize, AudiobookController.seemoreCategoryWise);

//analytics
router.post('/audio-book-analytics/:id', authorize, AudiobookController.audioBookAnalytics);

//updates
router.put('/update/:id', authorize, AudiobookController.updateAudioBook);
router.put('/update/:id/without-image', authorize, AudiobookController.updateAudioBookWithoutImage);
router.get('/get-assigned-category/:id', authorize, AudiobookController.getAssignedCategory);

//admin and approval status
router.get('/pendings', authorizeAdmin, AudiobookController.getAllPendings);
router.get('/rejected', authorizeAdmin, AudiobookController.getAllRejecteds);
router.put('/pendings/update/:id', authorizeAdmin, AudiobookController.updatePendings);
router.get('/:id', authorizeAdmin, AudiobookController.getAudiobookById);

//delete audiobook
router.put('/delete', authorize, AudiobookController.deleteAudioBook);

//single audiobook purchase 
router.post('/purchase_audiobook', authorize, AudiobookController.postPurchaedAudioBook);
router.get('/get-all-purchased-audiobooks/:id', authorize, AudiobookController.getAllPurchasedAudioBooks);


module.exports = router;
