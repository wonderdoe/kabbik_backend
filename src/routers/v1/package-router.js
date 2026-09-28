const express = require('express')
const router = express.Router()
const PackageController = require('../../controllers/package-controller')
const authorize = require('../../middlewares/auth-middleware')

router.get('/', authorize, PackageController.getAll)

module.exports = router;
