const PublisherModel = require('../data/models/publisher-model');
const CoreModel = require('../data/models/core-model');
const JWTHelper = require('../utils/jwt-helper');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const authorizeAdminPublisher = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearer = 'Bearer ';
        if (!authHeader || !authHeader.startsWith(bearer)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        const token = authHeader.replace(bearer, '');
        const jwtPayload = JWTHelper.verifyToken(token)
        // check role = 2 or 3
        if (jwtPayload.role != 2 && jwtPayload.role != 3) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        let entity = {}
        if (jwtPayload.role == 3) {
            entity = await PublisherModel.findById(jwtPayload.user_id);
        }
        else if(jwtPayload.role == 2){
            entity = await CoreModel.findByIdRole(jwtPayload.user_id, jwtPayload.role);
        }
        if (!entity) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        // can be used to check roles etc
        req.currentUser = entity;
        return next();

    } catch (e) {
        return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
    }
}

module.exports = authorizeAdminPublisher;