const ResponseUtils = require('../utils/res-utils');
const constants = require("../utils/constants");
const ReferModel = require('../data/models/refer-model');

class ReferController {

  insertReferEarnLog = async (userId, referredUerId, refer_code, amount, packageId) => {
    await ReferModel.insertReferEarnLog(userId, referredUerId, refer_code, amount, packageId);
    return true;
  };

  insertReferEarnLogFromApi = async (req, res) => {
    await ReferModel.insertReferEarnLog(req.body.userId, req.body.referredUerId, req.body.refer_code, req.body.amount);
    return ResponseUtils.respond(res, constants.HTTP_200, { success: true });
  };

  getUserEarning = async (req, res) => {
    const data = await ReferModel.getUserEarning(req);
    if (data && data.success === false) {
      return ResponseUtils.respond(res, constants.HTTP_404, data);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

    getClaimHistoryEarning = async (req, res) => {
    const data = await ReferModel.getClaimHistoryEarning(req);
    if (data && data.success === false) {
      return ResponseUtils.respond(res, constants.HTTP_404, data);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

   getReferHistory = async (req, res) => {
    const data = await ReferModel.getReferHistory(req);
    if (data && data.success === false) {
      return ResponseUtils.respond(res, constants.HTTP_404, data);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };


  requestToClaim = async (req, res) => {

    const data = await ReferModel.requestToClaim(req);
    if (!data.success) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        data.message || constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

}

module.exports = new ReferController