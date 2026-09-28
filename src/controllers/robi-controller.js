const HttpException = require('../utils/httpexception-utils');
const {
    validationResult
} = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const RobiModel = require('../data/models/robi-model');
const constants = require('../utils/constants');
const axios = require('axios').default;
const dotenv = require('dotenv');
dotenv.config();

class RobiController {

    getAll = async (req, res) => {
        const data = await RobiModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
    verifyPayment = async (req, res) => {
                const data = await RobiModel.verifyPayment(req.query.aocTransID);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }



    getRobiRedirect = async (req, res) => {
        // const bkashResponse = await BkashModel.getBkashRedirect(req.query);
        // console.log("pppp: " + req.query.reference)
        // console.log("pppp:jn ")
        var paymentRefID = req.query.aocTransID

        try{
                                    
            var returnValue = await RobiModel.verifyPayment(paymentRefID)
            var redirectURL;
                        if (returnValue == false) {
                                redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.aocTransID + "&paymentType=ROBI" +"&status=FAILED"

            } else {
                                redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.aocTransID + "&paymentType=ROBI" +"&status=SUCCEEDED"+(returnValue?`&phone=${returnValue}`:'')

            }


            res.redirect(redirectURL);
        }catch(e){
            console.log(e)
        }
    };
    printIt = async (req, res) => {
        const data = await RobiModel.printIt();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    createPayment = async (req, res) => {

                                const bkashResponse = await RobiModel.createPayment(req.body, req.headers);
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


    renewRobiSubscription = async (req, res) => {

        const result = await RobiModel.renewRobiSubscription();
         if (!result) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }


        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: result
        }
        );
    }


   renewRobiSubscriptionCronJob = async () => {
          await RobiModel.renewRobiSubscription();
          return true;
    };


    unsubscribeRobi = async (req, res) => {

                                const robiUnsubscribeResponse = await RobiModel.unsubscribeRobi(req, req);
        // console.log("val: " + JSON.stringify(robiUnsubscribeResponse))
        if (!robiUnsubscribeResponse) {
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
            data: robiUnsubscribeResponse
        }
        );
    };

    bkashCreateSubscriptionRequest = async (req, res) => {

                const bkashResponse = await RobiModel.bkashCreateSubscriptionRequest(req.body, req.headers);
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
        const bkashResponse = await RobiModel.bkashCreateSubscriptionRequestApp(req.body, req.headers);

        await RobiModel.addResponseDataCreate(bkashResponse, req)
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

module.exports = new RobiController