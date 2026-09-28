const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');
const axios = require('axios');
const StatusCheck = require('../../utils/status-code-check');
const moment = require('moment-timezone');
const { MERCHANT_ID, ACCOUNT_NUMBER, PUBLIC_KEY, PRIVATE_KEY, NAGAD_CREATE_PAYMENT, NAGAD_COMPLETE_PAYMENT, MERCHENT_CALLBACK_URL, CURRENCY_CODE, NAGAD_VERIFY_PAYMENT, URL_BKASH_REDIRECT } = require('../../utils/constants');
const PaymentHelper = require('../../utils/payment-helper');

class NagadModel {
    tableName = 'bkash';



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

    printIt = async () => {
        try {
            // const sql = `SELECT * FROM ${this.tableName} WHERE deleted = ?`;
            // const result = await DB.query(sql, [0]);
            // if (result) {
            //     return result;
            // }
            return "Hi Nagad";

        } catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    createPayment = async (req, headersData) => {
        var { amount, packageId, userId, from_channel, from_source, promo_code } = req.body;
        var {
            source: trafficSource = '',
            platform = ''
        } = req.query;

        if (!promo_code) {
            promo_code = ""
        }
        var orderId = this.makeSubscriptionId(8)
                const timeStamp = moment().tz('Asia/Dhaka').format('YYYYMMDDHHmmss');
        // const endpoint = `${NAGAD_CREATE_PAYMENT}/${MERCHANT_ID}/${orderId}`;
        const newIP = '103.138.144.97';
        const header = {
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-Client-Type': 'PC_WEB',
            'X-KM-IP-V4': '103.138.144.97'
        };
        const challenge = coreUtils.createHash(orderId);
        const sensitive = {
            merchantId: MERCHANT_ID,
            datetime: timeStamp,
            orderId: orderId,
            challenge: challenge,
        };


                const payload = {
            accountNumber: ACCOUNT_NUMBER,
            dateTime: timeStamp,
            sensitiveData: coreUtils.encrypt(sensitive, PUBLIC_KEY),
            signature: coreUtils.sign(sensitive, PRIVATE_KEY),
        };


                const that = this
        try {
            const url = NAGAD_CREATE_PAYMENT + "/" + MERCHANT_ID + "/" + orderId
                        var config = {
                method: 'POST',
                headers: header,
                data: payload,
                url,
            };
            const result = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {

                                if (error.response) {
                    return StatusCheck.checkStatus(error.response.data.errorCode);
                }
            });

            if (result.sensitiveData) {
                const decrypted = coreUtils.decrypt(
                    result.sensitiveData, PRIVATE_KEY
                );
                                const { paymentReferenceId, challenge, acceptDateTime } = decrypted;
                const nagadPaymentRes = {
                    orderId: orderId,
                    paymentReferenceId: paymentReferenceId,
                    challenge: challenge,
                    acceptDateTime: acceptDateTime,
                    sensitiveData: JSON.stringify(result.sensitiveData),
                    signature: JSON.stringify(result.signature),
                };

                const confirmArgs = {

                    paymentReferenceId: paymentReferenceId,
                    challenge: challenge,
                    orderId: orderId,
                    amount: amount,
                    ip: newIP
                }
                const res = await this.confirmPayment(confirmArgs, header);

                var parts = res.callBackUrl.split('/');
                var paymentRefID = parts.pop() || parts.pop();

                const insertSql = `INSERT INTO nagad_payment
        (merchantId, orderId, accountNumber, dateTime, challenge, payload, status, clientMobileNo, packageId, userId, paymentRefID, from_source, from_channel, amount, promo_code, trafficSource, platform) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?);`
                try {
                    PaymentHelper.insertCpaMarketingRecord(userId, packageId, req.body.clickId, req.body.pubId, "Nagad", amount);
                    const resultsInsertSql = await DB.query(insertSql, [MERCHANT_ID, orderId, ACCOUNT_NUMBER, timeStamp, challenge, JSON.stringify(payload), "INITIALIZED", null, packageId, userId, paymentRefID, from_source, from_channel, amount, promo_code, trafficSource, platform]);
                    if (resultsInsertSql) {
                                            }
                } catch (error) {
                    console.log(error);
                }
                return res;
            }
            return result;

        } catch (error) {
            console.log(error)
            return null

        }
    }


    //new added

    createPaymentForDynamicPurchase = async (req, headersData) => {
        var {
            userId,
            name,
            email,
            phone,
            address,
            amount,
            productId,
            promo_code,
            source,
            platform,
            type,
            store_item
        } = req.body;
        var {
            source: trafficSource = '',
            platform = ''
        } = req.query;

        if (!promo_code) {
            promo_code = ""
        }

        if (type == "Course" || type == "Audiobook" || type == "category") {

            const checkAudioBookExistsQuery = `SELECT Count(*) as is_exist FROM audiobooks_rent  WHERE user_id = ? AND audiobook_id = ? AND expired_at > NOW()  AND is_purchased = 1`;

            const checkExistsQuery = `SELECT Count(*) as is_exist FROM course_purchase_table  WHERE user_id = ? AND course_id = ?`;
            const checkCategoryAlreadyPurchased = `SELECT Count(*) as is_exist FROM purchased_category  WHERE user_id = ? AND category_id = ? AND expired_at > NOW()  AND is_purchased = 1`;

            let courseIsExsists;
            courseIsExsists = await DB.query(type == "Course" ? checkExistsQuery : type == "category" ? checkCategoryAlreadyPurchased : checkAudioBookExistsQuery, [userId, productId]);

            if (courseIsExsists[0].is_exist > 0) {
                return {
                    status: false,
                    message: type == "Course" ? "Course already purchased" : "Audiobook already purchased and date not expired",
                };
            }
        }




        var orderId = this.makeSubscriptionId(8)
        const timeStamp = moment().tz('Asia/Dhaka').format('YYYYMMDDHHmmss');
        // const endpoint = `${NAGAD_CREATE_PAYMENT}/${MERCHANT_ID}/${orderId}`;
        const newIP = '103.138.144.97';
        const header = {
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-Client-Type': 'PC_WEB',
            'X-KM-IP-V4': '103.138.144.97'
        };
        const challenge = coreUtils.createHash(orderId);
        const sensitive = {
            merchantId: MERCHANT_ID,
            datetime: timeStamp,
            orderId: orderId,
            challenge: challenge,
        };


                const payload = {
            accountNumber: ACCOUNT_NUMBER,
            dateTime: timeStamp,
            sensitiveData: coreUtils.encrypt(sensitive, PUBLIC_KEY),
            signature: coreUtils.sign(sensitive, PRIVATE_KEY),
        };


                const that = this
        try {
            const url = NAGAD_CREATE_PAYMENT + "/" + MERCHANT_ID + "/" + orderId
                        var config = {
                method: 'POST',
                headers: header,
                data: payload,
                url,
            };
            const result = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {

                                if (error.response) {
                    return StatusCheck.checkStatus(error.response.data.errorCode);
                }
            });

            if (result.sensitiveData) {
                const decrypted = coreUtils.decrypt(
                    result.sensitiveData, PRIVATE_KEY
                );
                const { paymentReferenceId, challenge, acceptDateTime } = decrypted;
                const nagadPaymentRes = {
                    orderId: orderId,
                    paymentReferenceId: paymentReferenceId,
                    challenge: challenge,
                    acceptDateTime: acceptDateTime,
                    sensitiveData: JSON.stringify(result.sensitiveData),
                    signature: JSON.stringify(result.signature),
                };

                const confirmArgs = {

                    paymentReferenceId: paymentReferenceId,
                    challenge: challenge,
                    orderId: orderId,
                    amount: amount,
                    ip: newIP
                }
                const res = await this.confirmPayment(confirmArgs, header);

                var parts = res.callBackUrl.split('/');
                var paymentRefID = parts.pop() || parts.pop();
                                                
                const paymentMethod = "Nagad";

                const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, email, phone, address, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method, store_item, purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                try {
                    const resultsInsertSql = await DB.query(storeLogInsertQuery, [
                        userId,
                        name,
                        email,
                        phone,
                        address,
                        paymentRefID,
                        orderId,
                        "INITIALIZED",
                        "CREATED",
                        amount,
                        promo_code,
                        source,
                        platform,
                        paymentMethod,
                        JSON.stringify(store_item),
                        type,
                        productId
                    ]);

                } catch (error) {
                    console.log(error);
                }
                return res;
            }
            return result;

        } catch (error) {
            console.log(error)
            return null

        }
    }

    //end

    addResponseDataRedirectSuccess = async (reference) => {

        var returnValue = true
                try {

            const insertSql = 'SELECT * FROM bkash_invoice WHERE split_part = ?;'
            const result = await DB.query(insertSql, [reference]);
            if (result) {

                                                                                                const d = new Date();
                let timeMi = d.getTime()
                                var getpaymentDetailsBySubscriptionId = await this.getBkashQuerySubscriptionRequest(result[0].subscriptionRequestId, null)

                const sqlPayer = `UPDATE bkash_invoice set payer =? WHERE split_part = ?;`;
                const resultPayer = await DB.query(sqlPayer, [getpaymentDetailsBySubscriptionId.payer, reference]);

                                var paymentDetailsBySubscriptionId = await this.getBkashQueryBySubscriptionID(getpaymentDetailsBySubscriptionId.id, null)
                var paymentDetailsData = await this.getBkashPaymentListSubscriptionID(getpaymentDetailsBySubscriptionId.id, null)
                                var lastPayment;
                if (paymentDetailsData.length > 0) {
                    var lastPayment = paymentDetailsData[paymentDetailsData.length - 1];
                    if (lastPayment.status == "FAILED_PAYMENT") {
                        returnValue = false
                    } else {
                        returnValue = true
                    }
                } else {
                    returnValue = false
                }


                // console.log(resultnew)
                // return result;
                // if (resultnew) {
                // const updateResult = updateUserWithGooglepay(packageId ,true,"Googlepay",purchaseTime,orderId,username)
                return returnValue;
                // } else {
                //     return returnValue;
                // }
            }

        } catch (e) {
            console.log(e)
            return returnValue;
        }

    }


    confirmPayment = async (data, headers) => {
        const { amount, challenge, ip, orderId, paymentReferenceId } = data;
        const sensitiveData = {
            merchantId: MERCHANT_ID,
            orderId: orderId,
            amount: amount,
            currencyCode: CURRENCY_CODE,
            challenge: challenge,
        };
        const payload = {
            paymentRefId: paymentReferenceId,
            sensitiveData: coreUtils.encrypt(sensitiveData, PUBLIC_KEY),
            signature: coreUtils.sign(sensitiveData),
            merchantCallbackURL: MERCHENT_CALLBACK_URL,
        };


        try {

            const url = NAGAD_COMPLETE_PAYMENT + "/" + paymentReferenceId
                        var config = {
                method: 'POST',
                headers: headers,
                data: payload,
                url,
            };
            const result = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {

                                if (error.response) {
                    return StatusCheck.checkStatus(error.response.data.errorCode);
                }
            });
            return result;

        } catch (error) {
            console.log(error)
            return null

        }
    }


    verifyPayment = async (paymentRefID) => {

        var returnValue = {
            success: true,
            fromSource: "kabbik",
            platform: "app"
        }

        var extraUiInfo = {};

        const selectQuery = 'SELECT * FROM nagad_payment WHERE paymentRefID = ?;'
        var resultQuery = await DB.query(selectQuery, [paymentRefID]);

        const storeLogFound = `SELECT * from store_log WHERE payment_id = ?`;

        if (!resultQuery || resultQuery.length < 1) {
            resultQuery = await DB.query(storeLogFound, [
                paymentRefID,
            ]);

            if (resultQuery.length < 1) {
                returnValue.success = false;
                return returnValue;
            }

            resultQuery[0].forProductPurchase = true;
        } else {
            resultQuery[0].forProductPurchase = false;
        }


        if (resultQuery[0].trafficSource == "Banglalink" && resultQuery[0].platform == "app") {
            returnValue.fromSource = "Banglalink"
        }
        if (resultQuery) {
            const header = {
                'X-KM-Api-Version': 'v-0.2.0',
                'X-KM-Client-Type': 'PC_WEB'
            };
            try {

                const url = NAGAD_VERIFY_PAYMENT + "/" + paymentRefID
                                var config = {
                    method: 'GET',
                    headers: header,
                    url,
                };
                const result = await axios(config).then(function (response) {
                    return response.data
                }).catch(function (error) {

                                        if (error.response) {
                        return false;
                    }
                });
                if (resultQuery[0].forProductPurchase && result.status == "Success") {

                    if (resultQuery[0].purchase_type == "Audiobook") {

                        const findAudiobook = `SELECT * from audiobooks where id = ? limit 1`;

                        const res = await DB.query(findAudiobook, [
                            resultQuery[0].product_id
                        ]);

                        extraUiInfo['title'] = "রেন্ট বুক (Book Rent)";
                        extraUiInfo['sub_title'] = `বইয়ের নাম: ${res[0].name}`;
                        extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${res[0].price}`;

                        const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
                        await DB.query(insertQuery, [
                            resultQuery[0].user_id,
                            resultQuery[0].product_id,
                            paymentRefID,
                            res[0].rent_duration_in_day
                        ]);
                    }
                    else if (resultQuery[0].purchase_type == "Course") {

                        const coursePurchaseQuery = `INSERT INTO course_purchase_table 
            (user_id, name, email, phone, address,course_id, price, promo_code, is_purchased) VALUES (?,?,?,?,?,?,?,?,1)`;

                        await DB.query(coursePurchaseQuery, [
                            resultQuery[0].user_id,
                            resultQuery[0].name,
                            resultQuery[0].email,
                            resultQuery[0].phone,
                            resultQuery[0].address,
                            resultQuery[0].product_id,
                            resultQuery[0].amount,
                            resultQuery[0].promo_code,
                        ]);

                        try {

                            extraUiInfo['title'] = "কোর্স ক্রয়";
                            const findCourseSql = `SELECT * from course where id = ? limit 1`;

                            const res = await DB.query(findCourseSql, [
                                resultQuery[0].product_id
                            ]);
                            extraUiInfo['sub_title'] = `${res[0].name}`;
                            extraUiInfo['short_description'] = `কোর্স ফি: BDT.${resultQuery[0].amount}`;

                        } catch (e) { }

                    }
                    else if (resultQuery[0].purchase_type == "category") {

                        const insertCategory = `INSERT INTO purchased_category (user_id, category_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;

                        const findCategory = `SELECT * from categories where id = ?`;

                        const findCatRes = await DB.query(findCategory, [
                            resultQuery[0].product_id
                        ]);


                        extraUiInfo['title'] = "রেন্ট ক্যাটেগরি (Category Rent)";
                        extraUiInfo['sub_title'] = `ক্যাটেগরি নাম: ${findCatRes[0].name}`;
                        extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${findCatRes[0].price}`;

                        await DB.query(insertCategory, [
                            resultQuery[0].user_id,
                            resultQuery[0].product_id,
                            paymentRefID,
                            findCatRes[0].rent_duration_day
                        ]);


                    }

                    else if (resultQuery[0].purchase_type == "store") {

                        const insertToStoreOrderTable = `INSERT INTO store_order (user_id, product_id, order_id, amount) VALUES ?`;
                        let values = [];

                        for (var item of JSON.parse(resultQuery[0].store_item)) {
                            values.push([
                                resultQuery[0].user_id,
                                item.id,
                                resultQuery[0].product_id,
                                item.offer_price
                            ]);
                        }

                        // Perform the bulk insert
                        await DB.query(insertToStoreOrderTable, [values]);
                    }

                    const storeLogInsertQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, status_message = ?  WHERE payment_id = ?`;
                    await DB.query(storeLogInsertQuery, [
                        1,
                        "COMPLETED",
                        "SUCCEEDED",
                        paymentRefID,
                    ]);


                    try {
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            resultQuery[0].user_id
                        ]);

                        if (Object.keys(extraUiInfo).length === 0) {
                            extraUiInfo = null;
                        }


                        await PaymentHelper.insertUserPaymentLog(
                            resultQuery[0].user_id,
                            findUsers[0].user_name,
                            findUsers[0].full_name,
                            resultQuery[0].product_id,
                            "Nagad",
                            resultQuery[0].purchase_type == "store" ? "Store"
                                : resultQuery[0].purchase_type == "category" ? "Category"
                                    : resultQuery[0].purchase_type == "Course" ? "Course" :
                                        resultQuery[0].purchase_type == "Audiobook" ? "Audiobook" : null,
                            1,
                            0,
                            "SUCCEEDED_PAYMENT",
                            0,
                            null,
                            resultQuery[0].transaction_id,
                            resultQuery[0].amount,
                            resultQuery[0].promo_code,
                            0,
                            null,
                            null,
                            null,
                           extraUiInfo ? JSON.stringify(extraUiInfo) : null
                        );

                    } catch (e) {
                        console.log("Errrrrrrrrrrrrrror", e)
                    }

                }
                else if (result.status == "Success") {


                    var someDate = new Date();
                    var numberOfDaysToAdd = 6;
                                        if (resultQuery[0].packageId != null && resultQuery[0].packageId == 1) {
                        numberOfDaysToAdd = 30
                    }
                    if (resultQuery[0].packageId != null && resultQuery[0].packageId == 2) {
                        numberOfDaysToAdd = 180
                    }
                    if (resultQuery[0].packageId != null && resultQuery[0].packageId == 3) {
                        numberOfDaysToAdd = 365
                    }
                    var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
                    var currentDateTime = new Date().valueOf()
                    var nextPaymentDateTime = result444
                                        var method = "Nagad"
                                        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

                    const resultUpdateUser = await DB.query(sqlUpdateUser, [true, result.orderId, method, resultQuery[0].packageId, currentDateTime, nextPaymentDateTime, 0, resultQuery[0].userId]);

                    const sqlUp = `UPDATE nagad_payment SET status = ? WHERE paymentRefID = ?`;

                    const resultnew = await DB.query(sqlUp, [result.status, paymentRefID]);

                    try {
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            resultQuery[0].userId
                        ]);

                        await PaymentHelper.insertUserPaymentLog(
                            resultQuery[0].userId,
                            findUsers[0].user_name,
                            findUsers[0].full_name,
                            resultQuery[0].packageId,
                            "Nagad",
                            "Subscription",
                            1,
                            0,
                            "SUCCEEDED_PAYMENT",
                            1,
                            null,
                            result.orderId,
                            resultQuery[0].amount,
                            resultQuery[0].promo_code,
                            0,
                            null
                        );

                    } catch (e) {
                        console.log("Errrrrrrrrrrrrrror", e)
                    }

                } else {

                    returnValue.success = false
                    return returnValue
                }

                returnValue.success = true
                return returnValue
            } catch (error) {
                console.log(error)
                returnValue.success = false
                return returnValue
            }
        } else {
            returnValue.success = false
            return returnValue
        }
    }


    bkashCreateSubscriptionRequest = async (bodyData, headersData) => {
        var data = {
            'subscriptionRequestId': bodyData.SUBSCRIPTIONREQUESTID,
            'serviceId': bodyData.SERVICEID,
            'paymentType': bodyData.PAYMENTTYPE,
            'subscriptionType': bodyData.SUBSCRIPTIONTYPE,
            'amountQueryUrl': bodyData.AMOUNTQUERYURL,
            'amount': bodyData.AMOUNT,
            'firstPaymentAmount': bodyData.FIRSTPAYMENTAMOUNT,
            'currency': bodyData.CURRENCY,
            'firstPaymentIncludedInCycle': bodyData.FIRSTPAYMENTINCLUDEDINCYCLE,
            'maxCapAmount': bodyData.MAXCAPAMOUNT,
            'maxCapRequired': bodyData.MAXCAPREQUIRED,
            'frequency': bodyData.FREQUENCY,
            'startDate': bodyData.STARTDATE,
            'expiryDate': bodyData.EXPIRYDATE,
            'payerType': bodyData.PAYERTYPE,
            'payer': bodyData.PAYER,
            'subscriptionReference': bodyData.SUBSCRIPTIONREFERENCE,
            'extraParams': bodyData.EXTRAPARAMS,
            'redirectUrl': bodyData.REDIRECTURL,
            'merchantShortCode': bodyData.MERCHANTSHORTCODE

        }

        const headers = {
            'version': headersData.version,
            'channelId': headersData.channelid,
            'timeStamp': headersData.timestamp,
            'x-api-key': headersData.xapikey,
            'Content-Type': headersData.contenttype
        }

        const that = this
        try {

                                    const url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscription"
            var config = {
                method: 'POST',
                headers: headers,
                data: data,
                url,
            };
            const obj = await axios(config).then(function (response) {
                
                that.addResponseData(JSON.stringify(response.data))
                return response.data
            }).catch(function (error) {

                                if (error.response) {
                    return StatusCheck.checkStatus(error.response.data.errorCode);
                    // return StatusCode.StatusCode.(res)
                }
            });

            
            // this.addResponseData(JSON.stringify(obj))
            return obj;

        } catch (error) {
            console.log(error)
            return null

        }
    }


    makeSubscriptionId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }

        var setResult = "KabbikXN" + result;
        return setResult;
    }


    bkashCreateSubscriptionRequestApp = async (bodyData, headersData) => {
        //         const sd = new Date(bodyData.STARTDATE);
        //         const ed = new Date(bodyData.EXPIRYDATE);
        // console.log(sd.toISOString());
        // console.log(ed.toISOString());
        // // expected output: Wed Oct 05 2011 16:48:00 GMT+0200 (CEST)
        // // (note: your timezone may vary)

        // console.log(event.toISOString());


        var userId = bodyData.USERID;
        var company_name = bodyData.company_name
        var click_id = bodyData.click_id


        var req_id = this.makeSubscriptionId(10)
        // console.log(JSON.stringify(bodyData));
        // var firstPaymentIncludedInCycle = true
        // var subscriptionType = "WITH_PAYMENT"
        // if(bodyData.FIRSTPAYMENTAMOUNT <=0){

        //     firstPaymentIncludedInCycle = false
        //     subscriptionType = "BASIC"

        // }
        var data = {
            'subscriptionRequestId': req_id,
            'serviceId': "100001",
            'paymentType': "FIXED",
            'subscriptionType': "WITH_PAYMENT",
            'amountQueryUrl': null,
            'amount': bodyData.AMOUNT,
            'firstPaymentAmount': bodyData.FIRSTPAYMENTAMOUNT,
            'currency': bodyData.CURRENCY,
            'firstPaymentIncludedInCycle': true,
            'maxCapAmount': null,
            'maxCapRequired': false,
            'frequency': bodyData.FREQUENCY,
            'startDate': bodyData.STARTDATE,
            'expiryDate': bodyData.EXPIRYDATE,
            'payerType': "CUSTOMER",
            'payer': null,
            'subscriptionReference': "MSMSR781D",
            'extraParams': null,
            'redirectUrl': URL_BKASH_REDIRECT,
            'merchantShortCode': "01978519690"

        }

        const headers = {
            'version': "v1.2",
            'channelId': "Merchant WEB",
            'timeStamp': "2021-08-24T12:04:31.353163Z",
            'x-api-key': "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
            'Content-Type': "application/json"
        }

        const that = this
        try {

                                    const url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscription"
            var config = {
                method: 'POST',
                headers: headers,
                data: data,
                url,
            };
            const obj = await axios(config).then(function (response) {
                
                return response.data
            }).catch(function (error) {
                if (error.response) {
                    return StatusCheck.checkStatus(error.response.data.errorCode);
                    // return StatusCode.StatusCode.(res)
                }
            });

                        if (click_id && company_name) {
                const insertSql = 'INSERT INTO promotion_track_table(company_name, track_id, bkash_request_id, user_id) VALUES (?,?, ?,?);'
                try {
                    const resultsInsertSql = await DB.query(insertSql, [company_name, click_id, req_id, userId]);
                    if (resultsInsertSql) {
                                            }
                } catch (error) {
                    console.log(error);
                }

            }
            // this.addResponseData(JSON.stringify(obj))
            return obj;

        } catch (error) {
            console.log(error)
            return null

        }
    }


}



module.exports = new NagadModel