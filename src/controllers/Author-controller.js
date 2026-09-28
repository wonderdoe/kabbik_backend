const authorModel = require("../data/models/author-model");
const constants = require("../utils/constants");
const ResponseUtils = require("../utils/res-utils");

class AuthorController {
  getAll = async (req, res) => {
    try {
      const limit = req.query.limit || 20;
      const page = req.query.page || 1;
      const searchParams = (req.query.search==='null'?null: req.query.search) || null;
      const data =  await authorModel.findAuthors(limit, page,searchParams);
	res.setHeader('Cache-Control', 'public, max-age=120');
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

}

module.exports = new AuthorController();
