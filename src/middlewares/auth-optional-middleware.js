const authHelper = require('../utils/auth-helper');

const authorizeOptional = async (req, res, next) => {
  try {
    const token = authHelper.parseBearerToken(req.headers.authorization);
    if (!token) {
      req.currentUser = null;
      req.user = null;
      return next();
    }

    const auth = await authHelper.resolveAuthenticatedUser(token);
    if (!auth) {
      req.currentUser = null;
      req.user = null;
      return next();
    }

    req.currentUser = auth.entity;
    req.user = auth.jwtPayload;
    return next();
  } catch (e) {
    req.currentUser = null;
    req.user = null;
    return next();
  }
};

module.exports = authorizeOptional;
