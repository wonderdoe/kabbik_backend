const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');
const axios = require("axios");
const crypto = require('crypto');
const moment = require("moment");
const StatusCheck = require("../../utils/status-code-check");
const PaymenLogUtils = require('../../utils/payment_log_utils');


class PaymentModel {
    tableName = 'payments';

    makeSubscriptionId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }

        var setResult = "Kabbikdcb" + result;
        return setResult;
    }

    getAll = async () => {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE deleted = ?`;
            const result = await DB.query(sql, [0]);
            if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    getAllDeleted = async () => {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE deleted = ?`;
            const result = await DB.query(sql, [1]);
            if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    deletePayment = async (orderId, deleted) => {
        try {
            const sql = `UPDATE ${this.tableName} SET deleted=? WHERE sp_order_id=?`;
            const result = await DB.query(sql, [deleted, orderId]);
            if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    getPaymentById = async (orderId) => {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE sp_order_id = ?`;
            const results = await DB.query(sql, [orderId]);
            if (results) {
                return results;
            }
            return undefined;
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    //Start-dev-mosaraf

    // createBlSubscription = async (req) => {
    //     try {

    //         const headers = {
    //             "Content-Type": "application/json",
    //             "X-Requested-With": "XMLHttpRequest"
    //         };

    //         const username = "kabbikmyblcallback";
    //         const password = "blKabbik@9";
    //         const channelId = "4";
    //         const ipAddress = "35.154.163.185";
    //         const cpId = "226";
    //         const msisdn = req.body.msisdn;
    //         const userId = req.body.userId;
    //         const planId = "9922610002";


    //         const url = "https://blk-6d-sdp.banglalink.net/api/auth/login";
    //         var config = {
    //             method: "POST",
    //             headers: headers,
    //             data: {
    //                 "username": username,
    //                 "password": password
    //             },
    //             url: url,
    //         };

    //         const obj = await axios(config)
    //             .then(function (response) {

    //                 return response.data;
    //             })
    //             .catch(function (error) {
    //                 if (error.response) {
    //                     return StatusCheck.checkStatus(error.response.data.errorCode);
    //                 }
    //             });

    //         const accessToken = obj.token;
    //         console.log("Access token found", accessToken);
    //         if (!accessToken) {
    //             return {
    //                 status: false,
    //                 message: "Unable to create payment. Invalid access token"
    //             };
    //         }


    //         const subscriptionUrl = "https://blk-6d-sdp.banglalink.net/api/public/SMPAY/PAYMENT";

    //         const subscription_id = this.makeSubscriptionId(7);
    //         const requestTimeStamp = moment().format("YYYY-MM-DD HH:mm:ss");

    //         const subscriptionOfferID =
    //             req.body.packageId == 1 ? "9922610005" :
    //                 (req.body.packageId == 2 && req.body.fromRenewal == 1) ? "9922610006" :
    //                     req.body.packageId == 2 ? "9922610007" : req.body.packageId == 3 ? "9922610008" :
    //                         req.body.packageId == 4 ? "9922610003" : null;



    //         const action = (req.body.packageId == 1 || req.body.packageId == 4) ? "ACT" :
    //             (req.body.packageId == 2 && req.body.fromRenewal == 1) ? "ACT" :
    //                 (req.body.packageId == 2 || req.body.packageId == 3) ? "Ondemand" : null;

    //         const chargeAmount = req.body.packageId == 1 ? "50" :
    //             req.body.packageId == 2 ? "250" : req.body.packageId == 3 ? "450" : req.body.packageId == 4 ? "4" : "";

    //         const paymentMethod = action == "ACT" ? "DCB_SUBS" : "DCB_ONE_OFF";

    //         if (!action || !subscriptionOfferID) {
    //             return {
    //                 status: false,
    //                 message: "Package id not valid"
    //             };
    //         }

    //         const subscriptionHeaders = {
    //             "Content-Type": "application/json",
    //             "Accept": "application/json",
    //             "X-Authorization": `Bearer ${accessToken}` // Bearer token header
    //         };


    //         const subscriptonData = {
    //             "requestId": subscription_id,
    //             "requestTimeStamp": requestTimeStamp,
    //             "channel": channelId,
    //             "sourceNode": "kabbik",
    //             "sourceAddress": ipAddress,
    //             "featureId": "Payment",
    //             "username": username,
    //             "password": password,
    //             "externalServiceId": msisdn,
    //             "requestParam": {
    //                 "chargeAmount": chargeAmount,
    //                 "cpId": cpId,
    //                 "planId": action == "ACT" ? planId : subscriptionOfferID,
    //                 "action": action,
    //                 "subscriptionId": subscription_id,
    //             }
    //         };

    //         if (action == "ACT") {
    //             subscriptonData["requestParam"]["subscriptionOfferID"] = subscriptionOfferID;
    //         }
    //         const subsConfig = {
    //             method: "POST",
    //             headers: subscriptionHeaders,
    //             data: subscriptonData,
    //             url: subscriptionUrl,
    //         };
    //         const objResult = await axios(subsConfig)
    //             .then(function (response) {

    //                 return response.data;
    //             })
    //             .catch(function (error) {
    //                 console.log("Errrrrrrrrrrrrrrrrror", error);
    //                 if (error.response) {
    //                     return {
    //                         "status": false,
    //                         "message": error
    //                     };
    //                 }
    //             });
    //         console.log("subscriptionUrlsubscriptionUrlsubscriptionUrlsubscriptionUrlsubscriptionUrl", subscriptionUrl)
    //         if (objResult.responseCode == 0) {
    //             const dcbInvoiceSql = `INSERT INTO dcb_invoice (request_id, subscription_id, msisdn, userId, payment_method, resut_description, 
    //             featured_id, subscriptionOfferID, package_id, amount, request_time_stamp, response_time_stamp,
    //              response_code, request_body, response_body, access_token, source, platfrom) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    //             await DB.query(dcbInvoiceSql, [
    //                 subscription_id,
    //                 objResult.resultParam.subscriptionId,
    //                 msisdn,
    //                 userId,
    //                 paymentMethod,
    //                 objResult.resultParam.resultDescription,
    //                 objResult.featureId,
    //                 subscriptionOfferID,
    //                 req.body.packageId,
    //                 chargeAmount,
    //                 objResult.requestTimeStamp,
    //                 objResult.responseTimeStamp,
    //                 objResult.responseCode,
    //                 JSON.stringify(subscriptonData),
    //                 JSON.stringify(objResult),
    //                 accessToken,
    //                 req.body.source,
    //                 req.body.platform,
    //             ]);
    //             return {
    //                 success: true,
    //                 message: "Payment in progress",
    //                 responseCode: objResult.responseCode,
    //             };
    //         }
    //         else if (objResult.responseCode == 1 && objResult.resultParam.resultCode == '293') {
    //             return {
    //                 success: true,
    //                 message: objResult.resultParam.resultDescription,
    //                 responseCode: objResult.responseCode
    //             };
    //         }
    //         else {
    //             return {
    //                 success: false,
    //                 message: objResult.resultParam.resultDescription,
    //                 responseCode: objResult.responseCode
    //             };
    //         }

    //     } catch (e) {
    //         return {
    //             "status": false,
    //             "message": e
    //         }
    //     }
    // }


  createBlSubscription = async (req) => {
        try {

            const headers = {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }; 

            const username = "kabbikmyblcallback";
            const password = "blKabbik@9";
            const channelId = "4";
            const ipAddress = "35.154.163.185";
            const cpId = "226";
            const msisdn = req.body.msisdn;
            const userId = req.body.userId;
            let featureId = "";
            let paymentMethod = "";
            let subscriptionUrl = "";
            const packageId = Number(req.body.packageId);
            const fromRenewal = Number(req.body.fromRenewal);



            const subscription_id = this.makeSubscriptionId(7);
            const requestTimeStamp = moment().format("YYYY-MM-DD HH:mm:ss");

            const subscriptionOfferID =
                packageId === 1 ? "9922610005" :
                    (packageId === 2 && fromRenewal === 1) ? "9922610006" :
                        packageId === 2 ? "9922610007" : packageId === 3 ? "9922610008" :
                            packageId === 4 ? "9922610003" : null;



            featureId = (packageId === 1 || packageId === 4) ? "ACTIVATION" :
                (packageId === 2 && fromRenewal === 1) ? "ACTIVATION" :
                    (packageId === 2 || packageId === 3) ? "Payment" : null;

            if (!subscriptionOfferID || !featureId) {
                return {
                    status: false,
                    message: "Package id not valid"
                };
            }

            const url = "https://blk-6d-sdp.banglalink.net/api/auth/login";

            var config = {
                method: "POST",
                headers: headers,
                data: {
                    "username": username,
                    "password": password
                },
                url: url,
            };
                       const obj = await axios(config)
                .then(function (response) {

                    return response.data;
                })
                .catch(function (err) {
                    if (err.response) {
                        // Server responded but with an error status
                        console.error("? Error:", err.response.status, err.response.statusText);
                        console.error("Message:", err.response.data);
                    } else if (err.request) {
                        // No response received
                        console.error("? No response from server:", err.message);
                    } else {
                        // Something went wrong setting up the request
                        console.error("? Request error:", err.message);
                    }
                });
 
            const accessToken = obj.token; 
                         
            if (!accessToken) {
                return {
                    status: false,
                    message: "Unable to create payment. Invalid access token"
                };
            }

            const subscriptionHeaders = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Authorization": `Bearer ${accessToken}` // Bearer token header
            };


            const chargeAmount = packageId === 1 ? "50" :
                packageId === 2 ? "250" : packageId === 3 ? "450" : packageId === 4 ? "4" : "";

            //    const subscriptionUrl = "https://blk-6d-sdp.banglalink.net/api/public/SMPAY/PAYMENT";

            let subscriptonData = {
                "requestId": subscription_id,
                "requestTimeStamp": requestTimeStamp,
                "channel": channelId,
                "sourceNode": "kabbik",
                "sourceAddress": ipAddress,
                "featureId": featureId,
                "username": username,
                "password": password,
                "externalServiceId": msisdn,
                "requestParam": {
                    "cpId": cpId,
                    "subscriptionId": subscription_id
                }
            };

            if (featureId == "ACTIVATION") {
                subscriptionUrl = "https://blk-6d-sdp.banglalink.net/api/public/SMACTIVATION/Activation";
                paymentMethod = "DCB_SUBS";
                subscriptonData.requestParam.subscriptionOfferID = subscriptionOfferID;
            } else {
                paymentMethod = "DCB_ONE_OFF";
                subscriptionUrl = "https://blk-6d-sdp.banglalink.net/api/public/SMPAY/PAYMENT"
                subscriptonData.requestParam.chargeAmount = chargeAmount;
                subscriptonData.requestParam.planId = subscriptionOfferID;
            }

            const subsConfig = {
                method: "POST",
                headers: subscriptionHeaders,
                data: subscriptonData,
                url: subscriptionUrl,
            };
            const objResult = await axios(subsConfig)
                .then(function (response) {
                    return response.data;
                })
                .catch(function (error) {
                                        if (error.response) {
                        return {
                            "status": false,
                            "message": error
                        };
                    }
                });

             
            if (objResult.responseCode === "0") {
               PaymenLogUtils.insertCpaMarketingRecord(userId, packageId, req.body.clickId, req.body.pubId, "BL", chargeAmount);

                const dcbInvoiceSql = `INSERT INTO dcb_invoice (request_id, subscription_id, msisdn, userId, payment_method, resut_description, 
                featured_id, subscriptionOfferID, package_id, amount, request_time_stamp, response_time_stamp,
                 response_code, request_body, response_body, access_token, source, platfrom) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                await DB.query(dcbInvoiceSql, [
                    subscription_id,
                    objResult.resultParam?.planId,
                    msisdn,
                    userId,
                    paymentMethod,
                    objResult.resultParam?.resultDescription,
                    objResult.featureId,
                    subscriptionOfferID,
                    packageId,
                    chargeAmount,
                    objResult.requestTimeStamp,
                    objResult.responseTimeStamp,
                    objResult.responseCode,
                    JSON.stringify(subscriptonData),
                    JSON.stringify(objResult),
                    accessToken,
                    req.body.source,
                    req.body.platform,
                ]);
                return {
                    success: true,
                    message: objResult.resultParam?.resultDescription,
                    responseCode: objResult.responseCode,
                };
            }
            else if (objResult.responseCode === "0" && (objResult.resultParam.resultCode === '112' || objResult.resultParam.resultCode === "852")) {
                return {
                    success: true,
                    message: objResult.resultParam.resultDescription,
                    responseCode: objResult.responseCode
                };
            }
            else {
                                return {
                    success: false,
                    message: objResult.resultParam.resultDescription,
                    responseCode: objResult.responseCode
                };
            }

        } catch (e) {
            console.log("EEEEEEEEEEEEEEEEEEEEEEEEER", e)
            return {
                "status": false,
                "message": e
            }
        }
    }



    dcbConsentApi = async (req) => {
        try {
            const findInvoiceSql = `SELECT * FROM dcb_invoice WHERE msisdn = ? ORDER BY id DESC LIMIT 1`;

            const invocie = await DB.query(findInvoiceSql, [req.body.msisdn]);
            if (!invocie || invocie.length < 1) {
                return {
                    "status": false,
                    "message": "Invoice Not found"
                }
            }

            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Authorization": `Bearer ${invocie[0].access_token}` // Bearer token header
            };

            const url = "https://blk-6d-sdp.banglalink.net/api/public/SMCONSENT/Consent";
            const requestId = this.makeSubscriptionId(7);
            const requestTimeStamp = moment().format("YYYY-MM-DD HH:mm:ss");
            const channelId = "4";
            const ipAddress = "35.154.163.185";
            const username = "kabbikmyblcallback";
            const password = "blKabbik@9";

            const data = {
                "requestId": requestId,
                "requestTimeStamp": requestTimeStamp,
                "channel": channelId,
                "sourceNode": "kabbik",
                "sourceAddress": ipAddress,
                "featureId": "Consent",
                "username": username,
                "password": password,
                "externalServiceId": req.body.msisdn,
                "requestParam": {
                    "subscriptionOfferID": invocie[0].subscriptionOfferID,
                    "cpId": "226",
                    "consentNo": req.body.consent
                }
            };

            const config = {
                method: "POST",
                headers: headers,
                data: data,
                url: url,
            };

            const objResult = await axios(config)
                .then(function (response) {

                    return response.data;
                })
                .catch(function (error) {
                    if (error.response) {
                        return {
                            "status": false,
                            "message": error
                        };
                    }
                });
                                                         if (objResult && objResult.responseCode === "0") {
                return {
                    success: true,
                    message: objResult.resultParam?.resultDescription,
                    responseCode: objResult.responseCode
                };
            }
            else {
                return {
                    success: false,
                    message: objResult.resultParam.resultDescription,
                    responseCode: objResult.responseCode
                };
            }
        }
        catch (e) {
            return {
                "status": false,
                "message": e
            }
        }
    }

    unsubscribedApiBLDcb = async (req) => {
        try {

            const url = "https://blk-6d-sdp.banglalink.net/api/public/SMDEACTIVATION/DEACTIVATION";
            const requestId = this.makeSubscriptionId(7);
            const requestTimeStamp = moment().format("YYYY-MM-DD HH:mm:ss");
            const channelId = "4";
            const ipAddress = "35.154.163.185";
            const username = "kabbikmyblcallback";
            const password = "blKabbik@9";
            const authurl = "https://blk-6d-sdp.banglalink.net/api/auth/login";
            const userId = req.body.userId;
            const cancelAll = req.body.isCancelAll;
            const invoiceSql = `SELECT * FROM dcb_invoice WHERE userId = ? ORDER BY id DESC LIMIT 1;`;

            const userInvoice = await DB.query(invoiceSql, [userId]);

            if (userInvoice.length < 1 || !userInvoice[0].msisdn || !userInvoice[0].subscriptionOfferID) {
                return {
                    "status": false,
                    "message": "Invoice not found"
                };
            }
            const authHeaders = {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            };
            var authConfig = {
                method: "POST",
                headers: authHeaders,
                data: {
                    "username": username,
                    "password": password
                },
                url: authurl,
            };

            const obj = await axios(authConfig)
                .then(function (response) {

                    return response.data;
                })
                .catch(function (error) {
                    if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
                    }
                });

            const accessToken = obj.token;

            if (!accessToken) {
                return {
                    status: false,
                    message: "Unable to create payment. Invalid access token"
                };
            }

            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Authorization": `Bearer ${obj.token}` // Bearer token header
            };



            const data = {
                "requestId": requestId,
                "requestTimeStamp": requestTimeStamp,
                "channel": channelId,
                "sourceNode": "kabbik",
                "sourceAddress": ipAddress,
                "featureId": "Deactivation",
                "username": username,
                "password": password,
                "externalServiceId": userInvoice[0].msisdn,
                "requestParam": {
                    "subscriptionOfferID": cancelAll ? "ALL" : userInvoice[0].subscriptionOfferID, //"ALL"
                    "cpId": "226",
                    "subscriptionId": requestId

                }
            };

            const config = {
                method: "POST",
                headers: headers,
                data: data,
                url: url,
            };

            const objResult = await axios(config)
                .then(function (response) {

                    return response.data;
                })
                .catch(function (error) {
                    if (error.response) {
                        return {
                            "status": false,
                            "message": error
                        };
                    }
                });

            if (!objResult && objResult.responseCode === "0") {
                const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, canceled_subscription = ? WHERE id = ?`;

                    const resultUpdateUser = await DB.query(sqlUpdateUser, [
                        true,
                        1,
                        userId,
                    ]);
                return {
                    success: true,
                    message: objResult.resultParam.resultDescription,
                    responseCode: objResult.responseCode
                };
            }
            else {
                return {
                    success: false,
                    message: objResult.resultParam.resultDescription,
                    responseCode: objResult.responseCode
                };
            }
        }
        catch (e) {

            return {
                "status": false,
                "message": e
            }
        }
    }

    //End

    createPayment = async (order_id, customer_order_id, amount, currency, name, phone_no, address, city, sp_massage, transaction_status, userId, audioBookId) => {
        try {
            const sql = 'CALL create_payment(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const results = await DB.query(sql, [order_id, customer_order_id, amount, currency, name, phone_no, address, city, sp_massage, transaction_status, userId, audioBookId]);
            if (results) {
                return results;
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    createPaymentSubscription = async (order_id, customer_order_id, amount, currency, name, phone_no, address, city, sp_massage, transaction_status, userId, audioBookId, packageId, t_of_payment, trafficSource, platform) => {
        try {
            const sql = 'CALL create_payment_subscribe(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?)';
            const results = await DB.query(sql, [order_id, customer_order_id, amount, currency, name, phone_no, address, city, sp_massage, transaction_status, userId, audioBookId, packageId, t_of_payment, trafficSource, platform]);
            if (results) {
                return results;
            }
        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    updatePayment = async (order_id, sp_code) => {
        //console.log("in payment model: " + order_id, sp_code)
        try {
            let tran_status = undefined
            if (sp_code == 1000) {
                tran_status = 'success'
            } else if (sp_code == 1061) {
                tran_status = 'canceled'
            } else if (sp_code == 1005) {
                tran_status = 'failed'
            }
            //console.log("transection status: " + tran_status)
            const sql = 'CALL update_payment(?, ?)'
            const result = await DB.query(sql, [order_id, tran_status]);
            //console.log(result)
            // if (result) {
            //     return result;
            // }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
    parmanentDeletePayment = async (orderId) => {
        try {
            const sql = `DELETE FROM ${this.tableName} WHERE sp_order_id = ?`;
            const results = await DB.query(sql, [orderId]);
            if (results) {
                return results;
            }
            return undefined;
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    updateVerifyPayment = async (data) => {
                try {
            // UPDATE `kabbik`.`payments` SET `sp_massage` = 'asdf', `transaction_status` = 'asdf' WHERE (`id` = '171');
            if (data.sp_massage == "Success") {
                const sql2 = `SELECT * from payments WHERE sp_order_id = ?`;
                const result2 = await DB.query(sql2, [data.order_id]);
                                const sql = `UPDATE payments SET sp_massage = ?, transaction_status = ? WHERE sp_order_id = ?`;
                const result = await DB.query(sql, [data.sp_massage, data.transaction_status, data.order_id]);

                var someDate = new Date();
                var numberOfDaysToAdd = 6;
                if (result2[0].package_id != null && result2[0].package_id == 1) {
                    numberOfDaysToAdd = 30
                }
                if (result2[0].package_id != null && result2[0].package_id == 2) {
                    numberOfDaysToAdd = 180
                }
                if (result2[0].package_id != null && result2[0].package_id == 3) {
                    numberOfDaysToAdd = 365
                }
                var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
                var currentDateTime = new Date().valueOf()
                var nextPaymentDateTime = result444
                                var method = "SurjoPay"
                                const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

                const resultUpdateUser = await DB.query(sqlUpdateUser, [true, data.order_id, method, result2[0].package_id, currentDateTime, nextPaymentDateTime, 0, result2[0].user_id]);
                if (result) {
                    return result;
                }
                return undefined;
            } else {

                const sql = `UPDATE payments SET sp_massage = ?, transaction_status = ? WHERE sp_order_id = ?`;
                const result = await DB.query(sql, [data.sp_massage, data.transaction_status, data.order_id]);
                if (result) {
                    return result;
                }
                return undefined;

            }

        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    insertAudiobookMobileApp = async (user_id, audiobook_id) => {
                var arraudiobook = JSON.parse("[" + audiobook_id + "]");
                const sql = `SELECT * FROM users_library WHERE user_id = ?`;
        const userData = await DB.query(sql, [user_id]);
                let alreadyPurchased = userData.map((el) => {
            return el.audiobook_id;
        });
        try {
            arraudiobook.map(async (element) => {
                let duplicate = false;
                alreadyPurchased.every(async (el) => {
                    if (el == element) {
                        duplicate = true;
                        return false;
                    }
                });
                if (duplicate == false) {
                    const sql = `INSERT INTO users_library(user_id, audiobook_id)
                    VALUES(?, ?);`;
                    const result = await DB.query(sql, [user_id, element]);
                    if (result) {
                                                return result;
                    }
                }
            })
                    } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }


    revenueCatWebhook = async (req) => {
        const data = req.body.event;
        const webhookSql = `INSERT INTO revenuecat_webhook (event_type, app_user_id, original_app_user_id, body_response, price, is_free_trial, store, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const updateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, 
        payment_method = ?, purchase_time = ?, next_purchase_time = ?, is_free_trial = ?,  subscription_id = ?, canceled_subscription = ? WHERE id = ?`;

        const unCanceledSubscriptionSql = `UPDATE users SET canceled_subscription = ?  WHERE id = ?`;
        const userUnsubscribedSql = `UPDATE users SET is_subscribed = ?, payment_method = ? WHERE id = ?`;
        const userPaymentLogSql = 'CALL create_user_payment_log(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';


        try {
            const isFreeTrial = data.period_type === "TRIAL" ? 1 : 0;
            const result = await DB.query(webhookSql, [data.type, data.app_user_id, data.original_app_user_id, JSON.stringify(data), data.price, isFreeTrial, data.store, data.currency]);

            const paymentMethod = data.store == "PLAY_STORE" ? "Googlepay" : data.store == "APP_STORE" ? "ApplePay" : "";

            const productMap = {
                "kabbik_99": 1,
                "monthly_pack_kabbik:monthly-pack-kabbik": 1,
                "kabbik_99_free_trial": 12,
                "monthly_pack_free_trail:monthly-pack-kabbik-free-trail": 12,
                "kabbik_499_6m": 2,
                "half_yearly_pack:half-yearly-pack": 2,
                "yearly_pack:yearly-pack": 3,
                "kabbik_999_1y": 3
            };

            const packageId = productMap[data.product_id] || 3;


            if ((data.type == 'INITIAL_PURCHASE' || data.type == 'RENEWAL' || data.type == "UNCANCELLATION") && !isNaN(parseInt(data.app_user_id))) {
                await DB.query(updateUser, [
                    packageId,
                    1,
                    paymentMethod,
                    data.purchased_at_ms,
                    data.expiration_at_ms,
                    isFreeTrial,
                    data.transaction_id,
                    0,
                    data.app_user_id
                ]);


                try {
                    const findUsersSql = `SELECT * from users where id = ?`;
                    const findUsers = await DB.query(findUsersSql, [
                        data.app_user_id
                    ]);

                    await PaymenLogUtils.insertUserPaymentLog(
                        data.app_user_id,
                        findUsers[0].user_name,
                        findUsers[0].full_name,
                        packageId,
                        paymentMethod,
                        "Subscription",
                        data.type === 'INITIAL_PURCHASE' ? 1 : 0,
                        1,
                        "SUCCEEDED_PAYMENT",
                        1,
                        null,
                        data.transaction_id,
                        (packageId == 1 || packageId == 12) ? '118' : packageId == 2 ? '598' : packageId == 3 ? '1198' : 0,
                        null,
                        0,
                        new Date(data.expiration_at_ms)
                    );

                } catch (e) {
                    console.log("Errrrrrrrrrrrrrror", e)
                }

            }
            else if (data.type == "CANCELLATION") {
                if (data.cancel_reason == "UNSUBSCRIBE" || data.cancel_reason == "DEVELOPER_INITIATED") {
                    await DB.query(unCanceledSubscriptionSql, [
                        1,
                        data.app_user_id
                    ]);


                    try {
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            data.app_user_id
                        ]);

                        await DB.query(userPaymentLogSql, [
                            data.app_user_id,
                            findUsers[0].user_name,
                            findUsers[0].full_name,
                            packageId,
                            paymentMethod,
                            "Subscription",
                            0,
                            1,
                            "UNSUBSCRIBED",
                            0,
                            null,
                            data.transaction_id,
                            0,
                            null,
                            1,
                            null
                        ]);


                    } catch (e) {
                        console.log("Errrrrrrrrrrrrrror", e)
                    }

                }
            }
            else if (data.type == "EXPIRATION") {
                await DB.query(userUnsubscribedSql, [
                    0,
                    "",
                    data.app_user_id
                ]);

                try {
                    const findUsersSql = `SELECT * from users where id = ?`;
                    const findUsers = await DB.query(findUsersSql, [
                        data.app_user_id
                    ]);

                    await PaymenLogUtils.insertUserPaymentLog(
                        data.app_user_id,
                        findUsers[0].user_name,
                        findUsers[0].full_name,
                        packageId,
                        paymentMethod,
                        "Subscription",
                        0,
                        1,
                        "UNSUBSCRIBED",
                        0,
                        null,
                        data.transaction_id,
                        0,
                        null,
                        1,
                        null
                    );

                } catch (e) {
                    console.log("Errrrrrrrrrrrrrror", e)
                }
            }
            return {
                "success": true,
                "data": result
            }

        }
        catch (e) {
            console.log("Errrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrror", e)
            return {
                "success": false,
                "data": e
            }
        }
    }


    insertAudiobookWeb = async (user_id, audiobook_id, customer_order_id) => {
                const sql = `SELECT * FROM users_library WHERE user_id = ?`;
        const userData = await DB.query(sql, [user_id]);
                let alreadyPurchased = userData.map((el) => {
            return el.audiobook_id;
        });
        try {
            audiobook_id.map(async (element) => {
                let duplicate = false;
                alreadyPurchased.every(async (el) => {
                    if (el == element) {
                        duplicate = true;
                        return false;
                    }
                });
                if (duplicate == false) {
                    const sql = `INSERT INTO users_library(user_id, audiobook_id, customer_order_id)
                    VALUES(?, ?, ?);`;
                    const result = await DB.query(sql, [user_id, element, customer_order_id]);
                    if (result) {
                                                return result;
                    }
                }
            })
                    } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

}

module.exports = new PaymentModel