const express = require("express");
const AuthorController = require("../../controllers/Author-controller");
const router = express.Router();


router.get("/get-authors", AuthorController.getAll);

module.exports = router;
