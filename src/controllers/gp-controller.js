const GpModel = require("../data/models/gp-model");
const constants = require("../utils/constants");
const ResponseUtils = require("../utils/res-utils");

class GpController {
  createPayment = async (req, res) => {
    try {
      const data = await GpModel.createPayment(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  redirectUrlOk = async (req, res) => {

    let redirectURL = 'https://kabbik.com/payment-status?message=Failed to charge&status=FAILED';
    try {
      const data = await GpModel.makePayment(req);
            if (data.success === false && data.rechargeUrl) {
        redirectURL = data.rechargeUrl;
      }
      else {
        redirectURL = `${constants.KABBIK_FRONTEND_URL
          }/payment-status?reference=${req.query.customerReference
          }&paymentType=gp&consentId=${req.query.consentId}&status=${data.success ? "SUCCEEDED" : "FAILED"
          }&message=${data.message}`;
      }
    } catch (e) {
      console.log("Errrrrrrrrrrrrrrrror ", e.message)
    }

    res.redirect(redirectURL);

  };

  redirectUrlRechargeOk = async (req, res) => {
    const data = await GpModel.rechargeAndbuySuccessful(req);
    res.redirect(data.redirectURL);

  };

  redirectUrlDeny = async (req, res) => {
    const response = await GpModel.denyPayment(req);
    res.redirect(response.redirectURL);

  };

  redirectUrlError = async (req, res) => {
    const response = await GpModel.errorPayment(req);
    res.redirect(response.redirectURL);
  };

  refundPayment = async (req, res) => {
    try {
      const data = await GpModel.refundPayment(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        err.message || constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  unsubscribe = async (req, res) => {
    try {
      const data = await GpModel.unsubscribe(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(res, constants.HTTP_500, err.message);
    }
  };

  unsubscribeCallback = async (req, res) => {
    try {
      const data = await GpModel.unsubscribeCallback(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respond(res, constants.HTTP_200, { success: true });
    }
  };

  renewalCharge = async (req, res) => {
    try {
      console.log("-------------------------gp controller--------------------Renewal Charge", req.body);
      const data = await GpModel.renewalCharge(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(res, constants.HTTP_500, err.message);
    }
  };

  renewalWarning = async (req, res) => {
    try {
      const data = await GpModel.renewalWarning(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(res, constants.HTTP_500, err.message);
    }
  };
}

module.exports = new GpController();
