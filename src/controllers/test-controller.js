const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
require('dotenv').config();



class testController {

    getTestData = async (req, res) => {
        return ResponseUtils.respond(res, constants.HTTP_200, {message:"this is get"});
    };
    
    postTestData = async (req, res) => {
        return ResponseUtils.respond(res, constants.HTTP_200, {message:"this is post"});
    };

}

module.exports = new testController;