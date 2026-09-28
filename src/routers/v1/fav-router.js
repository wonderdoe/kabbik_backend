const express = require('express');
const router = express.Router();
const FavController = require('../../controllers/fav-controller');
const authorize = require('../../middlewares/auth-middleware');

router.get('/', authorize, FavController.getAll);
router.post('/', authorize, FavController.createFav);
router.get('/user-favs', authorize, FavController.getForUser);
router.get('/get-by-ids', authorize, FavController.getByIds);
router.delete('/', authorize, FavController.deleteFav);

module.exports = router;
