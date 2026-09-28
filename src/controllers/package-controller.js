const PackageModel = require('../data/models/package-model')
const ResponseUtils = require('../utils/res-utils')
const constants = require('../utils/constants')
require('dotenv').config()

class PackageController {

    getAll = async (req, res) => {
        const data = await PackageModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
}

module.exports = new PackageController