const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const GamezopTrackerModel = require('../data/models/gamezop-tracker-model');

class GamezopTrackerController {

  insertGamezopTraffic = async (req, res) => {
    const { type, game_category, game_name, user_id } = req.body;
    const data = await GamezopTrackerModel.insertGamezopTraffic(type, game_category, game_name, user_id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  insertGamezopSessionTrack = async (req, res) => {
    
    const data = await GamezopTrackerModel.insertGamezopSessionTrack(
      req.body["subId"],
      req.body["score"],
      0,
      req.body["duration"],
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };
}

module.exports = new GamezopTrackerController();
