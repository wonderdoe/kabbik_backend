const express = require('express');
const router = express.Router();
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const HeroBannerController = require('../../controllers/hero-banner-controller')

router.get('/', authorizeAdmin, HeroBannerController.getHeroBanner); // authorizeAdmin dite hobe instead authorize
router.get('/:id', authorizeAdmin, HeroBannerController.getSingleHeroBanner); // authorizeAdmin dite hobe instead authorize


router.post('/', authorizeAdmin, HeroBannerController.postHeroBanner); // authorizeAdmin dite hobe.
router.delete('/', authorizeAdmin, HeroBannerController.deleteHeroBanner); // authorizeAdmin dite hobe.
router.put('/', authorizeAdmin, HeroBannerController.updateHeroBanner); // authorizeAdmin dite hobe.

module.exports = router;
