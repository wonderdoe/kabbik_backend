const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const PostTypeModel = require('../data/models/post-type-model');

class PostTypeController {
  getAll = async (req, res) => {
    try {
      const data = await PostTypeModel.findActiveList();
      return ResponseUtils.respond(res, constants.HTTP_200, { data });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
}

module.exports = new PostTypeController();
