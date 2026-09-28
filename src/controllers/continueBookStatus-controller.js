const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const {
    validationResult
} = require('express-validator');
const continueBookStatusModel = require('../data/models/continueBookStatus-model');
 

require('dotenv').config();

class continueBookStatusController {

    postBookListenStatus = async (req, res) => {
        const data = await continueBookStatusModel.postBookListenStatus(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }; 
    
    getUserWiseContinueData = async (req, res) => {
         const data = await continueBookStatusModel.getUserWiseContinueData(req, req.query.userId);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


    getBookCompletedData = async (req, res) => {
        const data = await continueBookStatusModel.getBookCompletedData(req);
       if (!data) {
           return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
       }
       return ResponseUtils.respond(res, constants.HTTP_200, data);
   };
}

module.exports = new continueBookStatusController;