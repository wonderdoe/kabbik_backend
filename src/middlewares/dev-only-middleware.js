const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { isDevEnvironment } = require('../swagger/swagger-setup');

const devOnly = (req, res, next) => {
  if (!isDevEnvironment()) {
    return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
  }
  return next();
};

module.exports = devOnly;
