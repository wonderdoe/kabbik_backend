const CoreModel = require('../data/models/core-model');
const JWTHelper = require('./jwt-helper');

const BEARER_PREFIX = 'Bearer ';

const parseBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return authHeader.replace(BEARER_PREFIX, '');
};

const resolveAuthenticatedUser = async (token) => {
  const jwtPayload = JWTHelper.verifyToken(token);
  const entity = await CoreModel.findByIdRole(
    jwtPayload.user_id,
    jwtPayload.role
  );

  if (!entity) {
    return null;
  }

  return { entity, jwtPayload };
};

module.exports = {
  BEARER_PREFIX,
  parseBearerToken,
  resolveAuthenticatedUser,
};
