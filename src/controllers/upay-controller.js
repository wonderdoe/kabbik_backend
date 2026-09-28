const HttpException = require('../utils/httpexception-utils');
const {
    validationResult
} = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const UpayModel = require('../data/models/upay-model');
const constants = require('../utils/constants');
const axios = require('axios').default;
const dotenv = require('dotenv');
dotenv.config();

class UpayController {

    getAll = async (req, res) => {
        const data = await UpayModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
    verifyPayment = async (req, res) => {
                const data = await UpayModel.verifyPayment(req.query.paymentRefID);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }



    getUpayRedirect = async (req, res) => {
        // const bkashResponse = await BkashModel.getBkashRedirect(req.query);
        // console.log("pppp: " + req.query.reference)
        // console.log("pppp:jn ")
        var invoice_id = req.query.invoice_id

                        // const selectQuery = 'SELECT * FROM nagad_payment WHERE paymentRefID = ?;'
        // const result = await DB.query(selectQuery, [paymentRefID]);
        // if (result) {
        var returnValue = await UpayModel.verifyPayment(invoice_id)
        var redirectURL;
        
        if (returnValue.fromSource == "Banglalink" && returnValue.platform == "app") {
            if (returnValue.success == false) {
                redirectURL = "https://mybl.kabbik.com/payment-status?reference="  + req.query.payment_ref_id +"&paymentType=UPAY"+"&upayStatus="+req.query.status+ "&message="+req.query.message+ "&status=FAILED"
            } else {
                redirectURL = "https://mybl.kabbik.com/payment-status?reference=" + req.query.payment_ref_id +"&paymentType=UPAY" +"&upayStatus="+req.query.status +"&message="+req.query.message+ "&status=SUCCEEDED"

            }
        } else {
            if (returnValue.success == false) {
                redirectURL = "https://kabbik.com/payment-status?reference="  + req.query.payment_ref_id +"&paymentType=UPAY"+"&upayStatus="+req.query.status+ "&message="+req.query.message+ "&status=FAILED"

            } else {
                redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.payment_ref_id +"&paymentType=UPAY" +"&upayStatus="+req.query.status +"&message="+req.query.message+ "&status=SUCCEEDED"

            }
        }

        
        res.redirect(redirectURL);
        // } else {

        //     redirectURL = "https://kabbik.com/payment-status?reference=" + "Nothing found" + "&status=FAILED"
        // }
    };
    printIt = async (req, res) => {
        const data = await UpayModel.printIt();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    createPayment = async (req, res) => {

                                const upayResponse = await UpayModel.createPayment(req, req.headers);
                if (!upayResponse) {
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
            data: upayResponse
        }
        );
    };    
    
    paymentAuth = async (req, res) => {

                                const upayResponse = await UpayModel.paymentAuth();
                if (!upayResponse) {
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
            data: upayResponse
        }
        );
    };

    bkashCreateSubscriptionRequest = async (req, res) => {

                const bkashResponse = await UpayModel.bkashCreateSubscriptionRequest(req.body, req.headers);
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
        const bkashResponse = await UpayModel.bkashCreateSubscriptionRequestApp(req.body, req.headers);

        await UpayModel.addResponseDataCreate(bkashResponse, req)
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

module.exports = new UpayController