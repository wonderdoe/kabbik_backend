const express = require("express");
const playlistController = require("../../controllers/playlist-controller");
const authorize = require("../../middlewares/auth-middleware");
const router = express.Router();


router.post("/create-folder",authorize, playlistController.createFolder);
router.post("/add-book-playlist",authorize, playlistController.addBooksToPlaylist);
router.delete("/:bookInPlayListId",authorize,playlistController.deleteBookFromPlayList)
router.patch("/update-folders",authorize,playlistController.editFoldersName)
router.get("/get-folder-books-user",authorize,playlistController.getAllBooksForUser)
router.get("/get-folder-books-user-new",authorize,playlistController.getAllBooksForUserNew)

module.exports = router;
