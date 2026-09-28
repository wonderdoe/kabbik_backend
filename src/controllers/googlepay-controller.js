const HttpException = require('../utils/httpexception-utils');
const { validationResult } = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const GooglepayModel = require('../data/models/googlepay-model');
const constants = require('../utils/constants');
const axios = require('axios').default;
const dotenv = require('dotenv');
dotenv.config();

class GooglepayController {

    getAll = async (req, res) => {
        const data = await GooglepayModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


    getGooglepaySubscriptionList = async (req, res) => {

                const googlepayResponse = await GooglepayModel.getGooglepaySubscriptionList(req);
                if (!googlepayResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    data: "Error"
                }
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: googlepayResponse
            }
        );
    };


 getGooglepaySubscriptionListV2 = async (req, res) => {
	
        const googlepayResponse = await GooglepayModel.getGooglepaySubscriptionListV2(req);
 
        if (!googlepayResponse) {
           return ResponseUtils.respond(
               res,
               constants.HTTP_200,
               {
                   data: "Error"
               }
           );
       }
       return ResponseUtils.respond(
           res,
           constants.HTTP_200,
           {
               data: googlepayResponse
           }
       );
   }


    getGooglepaySubscriptionItem = async (req, res) => {

                const googlepayResponse = await GooglepayModel.getGooglepaySubscriptionItem(req);
                if (!googlepayResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    data: "Error"
                }
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: googlepayResponse
            }
        );
    };

    findByUserProductID = async (req, res) => {

        const userId = req.query.userId;
        const productId = req.query.productId;
                const googlepayResponse = await GooglepayModel.findByUserProductID(userId, productId);
                if (!googlepayResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    data: "Error"
                }
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: googlepayResponse
            }
        );
    };

    googlepayCreatePurchase = async (req, res) => {

                const googlepayResponse = await GooglepayModel.googlepayCreatePurchase(req);
                if (!googlepayResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    data: "Error"
                }
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: googlepayResponse
            }
        );
    };

    googlepaySubscriptionUpdateUser = async (req, res) => {

                const googlepayResponse = await GooglepayModel.googlepaySubscriptionUpdateUser(req);
                if (!googlepayResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    data: "Error"
                }
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: googlepayResponse
            }
        );
    };



}

module.exports = new GooglepayController