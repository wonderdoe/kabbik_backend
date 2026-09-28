const AgentModel = require('../data/models/agent-model');
const JWTHelper = require('../utils/jwt-helper');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const authorizeAgent = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearer = 'Bearer ';
        if (!authHeader || !authHeader.startsWith(bearer)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        const token = authHeader.replace(bearer, '');
        const jwtPayload = JWTHelper.verifyToken(token)
        // check role = 3 = publisher
        // console.log(jwtPayload);
        if(jwtPayload.role != 3) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        const entity = await AgentModel.findByIdAgent(jwtPayload.user_id);
        if (!entity) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        // can be used to check roles etc
        req.currentUser = entity;
        return next();

    } catch (e) {
        // e.status = 401;
        return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
    }
}

module.exports = authorizeAgent;