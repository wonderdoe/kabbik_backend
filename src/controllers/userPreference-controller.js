const user_preferenceModel = require('../data/models/user_preference-model');
const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
require('dotenv').config();

class UserPreferenceController {
    createUserPreference = async (req, res) => {
      try {
        const data = await user_preferenceModel.createUserPreference(req.body);
        return ResponseUtils.respond(res, constants.HTTP_200, data);
      } catch (err) {
        console.error(err);
        return ResponseUtils.respondError(
          res,
          constants.HTTP_500,
          constants.INTERNAL_SERVER_ERROR
        );
      }
    };

    getUserWisePreferences = async (req, res) => {
      try {
        const data = await user_preferenceModel.getUserWisePreferences(req.body);
        return ResponseUtils.respond(res, constants.HTTP_200, data);
      } catch (err) {
        console.error(err);
        return ResponseUtils.respondError(
          res,
          constants.HTTP_500,
          constants.INTERNAL_SERVER_ERROR
        );
      }
    }
}

module.exports = new UserPreferenceController;