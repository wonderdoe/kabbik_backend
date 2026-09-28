const ResponseUtils = require("../utils/res-utils");
const AmrpayModel = require("../data/models/amrpay-model");
const constants = require("../utils/constants");

require("dotenv").config();

class AmrpayController {
  createPaymentAmrpay = async (req, res) => {
    const combinedData = await AmrpayModel.createPaymentAmrpay(req);
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: combinedData,
    });
  };

  successRedirectAmrpay = async (req, res) => {
    var returnValue = await AmrpayModel.successRedirectAmrpay(req);
    var redirectURL;

    if (
      returnValue.fromSource === "Banglalink" &&
      returnValue.platform === "app"
    ) {
      if (!returnValue.success) {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.body.mer_txnid +
          "&paymentType=aamarPay" +
          "&aamarPayStatus=" +
          req.body.pay_status +
          "&message=" +
          req.body.pay_status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.body.mer_txnid +
          "&paymentType=aamarPay" +
          "&aamarPayStatus=" +
          req.body.pay_status +
          "&message=" +
          req.body.pay_status +
          "&status=SUCCEEDED";
      }
    } else {
      if (!returnValue.success) {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.body.mer_txnid +
          "&paymentType=aamarPay" +
          "&aamarPayStatus=" +
          req.body.pay_status +
          "&message=" +
          req.body.pay_status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.body.mer_txnid +
          "&paymentType=aamarPay" +
          "&aamarPayStatus=" +
          req.body.pay_status +
          "&message=" +
          req.body.pay_status +
          "&status=SUCCEEDED";
      }
    }
    res.redirect(redirectURL);
  };
}

module.exports = new AmrpayController();
