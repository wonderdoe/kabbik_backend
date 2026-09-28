const HttpException = require('../utils/httpexception-utils');
const { validationResult } = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const PaymentModel = require('../data/models/payment-model');
const PaymentHelper = require('../utils/payment-helper')
const constants = require('../utils/constants');
const axios = require('axios').default;
const dotenv = require('dotenv');
dotenv.config();

class PaymentController {

    getAll = async (req, res) => {
        const data = await PaymentModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    deleted = async (req, res) => {
        const orderId = req.body.orderId
        const deleted = req.body.deleted
        const data = await PaymentModel.deletePayment(orderId, deleted);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    getAllDeleted = async (req, res) => {
        const data = await PaymentModel.getAllDeleted();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    getPaymentById = async (req, res) => {
        const data = await PaymentModel.getPaymentById(req.query.orderId);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

//start-dev-mosaraf

createBlSubscription = async (req, res) => {
        const data = await PaymentModel.createBlSubscription(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }



createBlSubscriptionNew = async (req, res) => {
        const data = await PaymentModel.createBlSubscriptionNew(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }



    dcbConsentApi = async (req, res) => {
        const data = await PaymentModel.dcbConsentApi(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }  

    unsubscribedApiBLDcb = async (req, res) => {
        const data = await PaymentModel.unsubscribedApiBLDcb(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_200, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


//end

    init = async (req, res) => {
        const customerData = req.body;
        var {
            source: trafficSource = '',
            platform = ''
        } = req.query;

        var successReturnUrl = constants.RETURN_URL;
        var failureReturnUrl = constants.CANCEL_URL;

        if(trafficSource == "Banglalink" && platform == "app"){

            successReturnUrl = constants.MYBL_RETURN_URL;
            failureReturnUrl = constants.MYBL_CANCEL_URL;
        }
        try {
                        const response = await axios.post(
                `${constants.SHURJO_BASE_URL}/get_token`,
                {
                    "username": constants.SP_USERNAME,
                    "password": constants.SP_PASSWORD
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            );
            if (response.status == 200) {
                let Gtoken = response.data.token;
                try {
                    const secondResponse = await axios.post(
                        `${constants.SHURJO_BASE_URL}/secret-pay`,
                        {
                            prefix: constants.SP_ORDER_PREFIX,
                            token: Gtoken,
                            // return_url: 'http://localhost:8081/#/paymentSuccess',
                            // cancel_url: 'http://localhost:8081/#/paymentFailure',
                            return_url: successReturnUrl,
                            cancel_url: failureReturnUrl,
                            store_id: constants.STORE_ID,
                            amount: customerData.amount,
                            order_id: constants.SP_ORDER_PREFIX + PaymentHelper.generateOrderId(),
                            currency: "BDT",
                            customer_name: customerData.customer_name,
                            customer_address: customerData.customer_address,
                            customer_phone: customerData.customer_phone,
                            customer_city: customerData.customer_city,
                            customer_post_code: customerData.customer_post_code,
                            client_ip: "102.101.1.1"
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${Gtoken}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    if (secondResponse.status == 200) {
                        let data = secondResponse.data;
                                                if (customerData.package_id == null) {
                            PaymentHelper.insertPayment(data, customerData.user_id, customerData.audiobook_id)
                        } else {
                            var bkash = "SurjoPay"
                            PaymentHelper.insertPaymentSubscribe(data, customerData.user_id, customerData.audiobook_id, customerData.package_id, bkash, trafficSource, platform)
                        }
                        return ResponseUtils.respond(res, constants.HTTP_200, data);
                    }
                    else {
                        return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to payment!');
                    }
                }
                catch (e) {
                    console.log("E : " + e)
                    return ResponseUtils.respondError(res, constants.HTTP_500, constants.GENERIC_ERROR);
                }
            }
            return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to proceed payment');
        }
        catch (e) {
            console.log("E : " + e)
            return ResponseUtils.respondError(res, constants.HTTP_500, constants.GENERIC_ERROR);
        }
    }

    paymentCallback = async (req, res) => {
        const orderId = req.body.orderId
        PaymentHelper.handlePaymentCallback(orderId)
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: {
                    success: true
                }
            }
        );
    }

    paymentUpdate = async (req, res) => {
        const orderId = req.params.id
        const sp_code = req.body.sp_code
        const result = await PaymentModel.updatePayment(orderId, sp_code);
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: {
                    success: true
                }
            }
        );
    }

    verifyPayment = async (req, res) => {
        const orderId = req.body.sp_order_id
        try {
            const response = await axios.post(
                `${constants.SHURJO_BASE_URL}/get_token`,
                {
                    "username": constants.SP_USERNAME,
                    "password": constants.SP_PASSWORD
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            );
            if (response.status == 200) {
                let Gtoken = response.data.token;
                try {
                    const secondResponse = await axios.post(
                        `${constants.SHURJO_BASE_URL}/verification`,
                        {
                            order_id: orderId
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${Gtoken}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    if (secondResponse.status == 200) {
                        const data = secondResponse.data[0];
                        await PaymentModel.updateVerifyPayment(data);
                        return ResponseUtils.respond(res, constants.HTTP_200, data);
                    } else {
                        return ResponseUtils.respondError(res, constants.HTTP_401, 'something went wrong!');
                    }
                } catch (error) {
                    console.log(error)
                }
            }

        } catch (error) {
            console.log(error)
        }
    }

    audiobookInsertMobileApp = async (req, res) => {
        const audiobookData = req.body;
                const result = await PaymentModel.insertAudiobookMobileApp(audiobookData.user_id, audiobookData.audiobook_id);
                return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: 'success'
            }
        );
    }

    audiobookInsertWeb = async (req, res) => {
        const audiobookData = req.body;
                const result = await PaymentModel.insertAudiobookWeb(audiobookData.user_id, audiobookData.audiobook_id, audiobookData.customer_order_id);
                return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: 'success'
            }
        );
    }


    revenueCatWebhook = async (req, res) => {
      
    const result = await PaymentModel.revenueCatWebhook(req);
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: 'success'
            }
        );
    }



    deletePayment = async (req, res) => {
        const orderId = req.query.orderId
        const result = await PaymentModel.parmanentDeletePayment(orderId)
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_201,
            {
                id: result.affectedRows,
            }
        );
    }
}

module.exports = new PaymentController