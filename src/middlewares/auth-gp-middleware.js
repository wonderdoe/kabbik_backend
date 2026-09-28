const constants = require("../utils/constants");
const ResponseUtils = require("../utils/res-utils");

const authGPMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const [username, password] = atob(authHeader.replace("Basic ", "")).split(
      ":"
    );
    if (
      username !== process.env.TELENOR_LINX_AUTH_USERNAME ||
      password !== process.env.TELENOR_LINX_AUTH_PASSWORD
    ) {
      throw new Error("Unauthorized");
    }
    return next();
  } catch (err) {
    ResponseUtils.respondError(res, constants.HTTP_500, err.message);
  }
};

module.exports = authGPMiddleware;
