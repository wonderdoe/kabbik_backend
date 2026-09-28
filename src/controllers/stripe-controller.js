const ResponseUtils = require('../utils/res-utils');
const PaymentModel = require('../data/models/stripe-model');
const constants = require('../utils/constants');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const dotenv = require('dotenv');
dotenv.config();

class StripeController {


    createStripePayment = async (req, res) => {
        const data = await PaymentModel.createStripePayment(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    redirectUrlStripe = async (req, res) => {

        var returnValue = {
            success: false
        }
        const sessionId = req.query.session_id;

        var paymentResult;

        try {
            if (sessionId) {
                paymentResult = await stripe.checkout.sessions.retrieve(sessionId);
                returnValue.success = paymentResult.payment_status == 'paid' ? true : false;

            }
            else {
                returnValue.success = false;
            }
        }
        catch (e) { }
        var redirectURL;

        if (returnValue.success == false) {
            redirectURL = "https://kabbik.com/payment-status?stripeStatus=Failed&message=Failed&status=FAILED"

        } else {
            redirectURL = "https://kabbik.com/payment-status?stripeStatus=Success&message=Success&status=SUCCEEDED"
        }
        res.redirect(redirectURL);
    }

    manageSubscriptions = async (req, res) => {
        var returnValue = await PaymentModel.manageSubscriptions(req);
        return ResponseUtils.respond(res, constants.HTTP_200, returnValue);
    }

    stripeWebhook = async (req, res) => {
        var returnValue = await PaymentModel.stripeWebhook(req);
        return ResponseUtils.respond(res, constants.HTTP_200, returnValue);
    }

    createGooglePayStripePayment = async (req, res) => {
        req.body.platform = req.body.platform || "WEB";
        req.body.paymentMethod = "GOOGLE_PAY";

        const data = await PaymentModel.createStripePayment(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
}

module.exports = new StripeController