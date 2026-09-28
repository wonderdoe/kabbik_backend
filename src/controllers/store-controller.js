const ResponseUtils = require("../utils/res-utils");
const StoreModel = require("../data/models/store-model");
const constants = require("../utils/constants");
 

require("dotenv").config();

class StoreController {
   
    getStoreItem = async (req, res) => {
        const combinedData = await StoreModel.getStoreItem(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    };

    getAllStoreItem = async (req, res) => {
        const combinedData = await StoreModel.getAllStoreItem(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, {
            success: true,
            data: combinedData
        });
    };

}

module.exports = new StoreController();
