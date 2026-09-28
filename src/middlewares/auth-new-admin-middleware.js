const CoreModel = require('../data/models/core-model')
const JWTHelper = require('../utils/jwt-helper')
const ResponseUtils = require('../utils/res-utils')
const constants = require('../utils/constants')

const authorizeNewAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        const bearer = 'Bearer '
        if (!authHeader || !authHeader.startsWith(bearer)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ)
        }
        const token = authHeader.replace(bearer, '');
        const jwtPayload = JWTHelper.verifyTokenNewAdmin(token)
        const entity = await CoreModel.findByIdRoleNewAdmin(
            jwtPayload.id,
            2
        )
        if (!entity) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ)
        }

                                let user_ip = ""
        try {
            if (req.headers["x-forwarded-for"]) {

                user_ip = JSON.stringify(req.headers["x-forwarded-for"])
            } else {
                user_ip = "N/A"
            }
        } catch {

        }

        req.currentUser = entity
        req.user_ip = user_ip
        return next()

    } catch (e) {
        // e.status = 401;
        return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ)
    }
}

module.exports = authorizeNewAdmin
