const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const {
  parseBearerToken,
  resolveAuthenticatedUser,
} = require("../utils/auth-helper");

const authorize = async (req, res, next) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }

    const auth = await resolveAuthenticatedUser(token);
    if (!auth) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }

    let user_ip = "";
    try {
      if (req.headers["x-forwarded-for"]) {
        user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
      } else {
        user_ip = "N/A";
      }
    } catch {}

    req.currentUser = auth.entity;
    req.user = auth.jwtPayload;
    req.user_ip = user_ip;
    return next();
  } catch (e) {
    // e.status = 401;
    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      constants.UNAUTH_REQ
    );
  }
};

module.exports = authorize;
