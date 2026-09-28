const PublisherModel = require('../data/models/publisher-model');
const JWTHelper = require('../utils/jwt-helper');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const authorizePublisher = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearer = 'Bearer ';
        if (!authHeader || !authHeader.startsWith(bearer)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        const token = authHeader.replace(bearer, '');
        const jwtPayload = JWTHelper.verifyToken(token)
        // check role = 3 = publisher
        if(jwtPayload.role != 3) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        // jwtPayload.user_id is a publisher_users.id — map it to the publisher it
        // belongs to (publisher_users.publisher_id) before loading book_publishers.
        // Looking book_publishers up directly by user_id is a different table's id
        // and 401s whenever the two happen not to collide.
        const publisherId = await PublisherModel.getPublisherIdByUserId(jwtPayload.user_id);
        const entity = publisherId
            ? await PublisherModel.findByIdPublisherBook(publisherId)
            : undefined;
        if (!entity) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
        // can be used to check roles etc
        req.currentUser = entity;
        // verified token payload ({user_id, role}) for handlers that must resolve
        // the caller's own publisher instead of trusting a query param
        req.jwtPayload = jwtPayload;
        return next();

    } catch (e) {
        // e.status = 401;
        return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
    }
}

module.exports = authorizePublisher;