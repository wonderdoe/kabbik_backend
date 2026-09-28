const HttpException = require('../utils/httpexception-utils');
const {
    validationResult
} = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const NagadModel = require('../data/models/nagad-model');
const constants = require('../utils/constants');
const axios = require('axios').default;
const dotenv = require('dotenv');
dotenv.config();

class NagadController {

    getAll = async (req, res) => {
        const data = await NagadModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
    verifyPayment = async (req, res) => {
                const data = await NagadModel.verifyPayment(req.query.paymentRefID);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }



    getNagadRedirect = async (req, res) => {
        // const bkashResponse = await BkashModel.getBkashRedirect(req.query);
        // console.log("pppp: " + req.query.reference)
        // console.log("pppp:jn ")
        var paymentRefID = req.query.payment_ref_id

                        // const selectQuery = 'SELECT * FROM nagad_payment WHERE paymentRefID = ?;'
        // const result = await DB.query(selectQuery, [paymentRefID]);
        // if (result) {
        var returnValue = await NagadModel.verifyPayment(paymentRefID)
        var redirectURL;
                if (returnValue.fromSource == "Banglalink" && returnValue.platform == "app") {
            if (returnValue.success == false) {
                redirectURL = "https://mybl.kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=FAILED"
            } else {
                redirectURL = "https://mybl.kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=SUCCEEDED"

            }
        } else {
            if (returnValue.success == false) {
                redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=FAILED"

            } else {
                redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=SUCCEEDED"

            }
        }
        // if (returnValue == false) {
        //     console.log("uuuuuu");
        //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=FAILED"

        // } else {
        //     console.log("uuuuuu");
        //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.payment_ref_id + "&paymentType=NAGAD" + "&nagadStatus=" + req.query.status + "&message=" + req.query.message + "&status=SUCCEEDED"

        // }


        res.redirect(redirectURL);
        // } else {

        //     redirectURL = "https://kabbik.com/payment-status?reference=" + "Nothing found" + "&status=FAILED"
        // }
    };
    printIt = async (req, res) => {
        const data = await NagadModel.printIt();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    createPayment = async (req, res) => {

                                const bkashResponse = await NagadModel.createPayment(req, req.headers);
                if (!bkashResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }

        // var redirectURL = bkashResponse.redirectURL
        // console.log(redirectURL)
        // Redirect(
        //     redirectURL
        // )

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };




//dev mosaraf new added
    createDynamicPayment = async (req, res) => {

                                const bkashResponse = await NagadModel.createPaymentForDynamicPurchase(req, req.headers);
                if (!bkashResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }

        // var redirectURL = bkashResponse.redirectURL
        // console.log(redirectURL)
        // Redirect(
        //     redirectURL
        // )

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };







    bkashCreateSubscriptionRequest = async (req, res) => {

                const bkashResponse = await NagadModel.bkashCreateSubscriptionRequest(req.body, req.headers);
                if (!bkashResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }

        // var redirectURL = bkashResponse.redirectURL
        // console.log(redirectURL)
        // Redirect(
        //     redirectURL
        // )

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };


    bkashCreateSubscriptionRequestApp = async (req, res) => {

        // console.log("here: " + JSON.stringify(req.headers))
        const bkashResponse = await NagadModel.bkashCreateSubscriptionRequestApp(req.body, req.headers);

        await NagadModel.addResponseDataCreate(bkashResponse, req)
        // console.log("val: " + JSON.stringify(bkashResponse))
        if (!bkashResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }

        // var redirectURL = bkashResponse.redirectURL
        // console.log(redirectURL)
        // Redirect(
        //     redirectURL
        // )

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };




}

module.exports = new NagadController