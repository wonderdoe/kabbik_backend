const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const authorizeExternal = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearer = 'Bearer ';
        if (!authHeader || !authHeader.startsWith(bearer)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        const token = authHeader.replace(bearer, '');
        if(token != constants.EXTERNAL_TOKEN) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        return next();
    } catch (e) {
        // e.status = 401;
        return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
    }
}

module.exports = authorizeExternal;