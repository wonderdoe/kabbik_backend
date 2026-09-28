const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');
const axios = require('axios');
const StatusCheck = require('../../utils/status-code-check');
const moment = require('moment-timezone');
const { MERCHANT_ID, ACCOUNT_NUMBER, PUBLIC_KEY, PRIVATE_KEY, NAGAD_CREATE_PAYMENT, ROBI_RENEW_SUBSCRIPTION_URL, NAGAD_COMPLETE_PAYMENT, MERCHENT_CALLBACK_URL, CURRENCY_CODE, NAGAD_VERIFY_PAYMENT, ROBI_AOC_Token_URL, ROBI_AOC_BILLING_URL, ROBI_APIKEY, ROBI_USERNAME, ROBI_ONBEHALF_OF, ROBI_CALLBACK_URL, ROBI_UNSUBSCRIBE_URL, ROBI_CONTACT_INFO, ROBI_CHARGE_STATUS_URL, ROBI_CANCEL_SUBSCRIPTION_URL, URL_BKASH_REDIRECT } = require('../../utils/constants');

const PaymentHelper = require('../../utils/payment-helper');
const userModel = require('./user-model');


class RobiModel {
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

    createPayment = async (bodyData, headersData) => {
        var { amount, packageId, userId, from_channel, from_source, promo_code, from_autorenewal = from_autorenewal || 0 } = bodyData;
                if (!promo_code) {
            promo_code = ""
        }

        const sql = `SELECT * FROM subscription_packages AS sp WHERE sp.subscriptionItemId=?`;
        const packageResult = await DB.query(sql, [packageId]);
        if (packageResult) {
            const subscriptionPackage = packageResult[0];
            if (subscriptionPackage.id) {
                from_autorenewal = packageResult.isOnetime ? 0 : 1;
            }
        }
        var orderId = this.makeSubscriptionId(8)
        const timeStamp = moment().tz('Asia/Dhaka').format('YYYYMMDDHHmmss');

        var subscriptionID;
        var subscriptionDuration;
        var isSubscription;

        if (bodyData.type == "Audiobook" || bodyData.type==='category' || bodyData.type==='quiz') {
          //  subscriptionID = amount == 10 ? "KabbiqAdbkRnt10" : amount == 20 ? "KabbiqAdbkRnt20" : ""
        
            subscriptionID = "KabbiqAdbkRnt"
            subscriptionDuration = 60;
            isSubscription = false;
                    }
        else {
            subscriptionID = packageId == 4 ? 'KabbiqDailyRcrr'
                : (packageId == 3 || packageId==21) ? 'Kabbik 1 Year'
                    : (packageId == 2 && from_autorenewal == 1) ? 'Kabbik 6 months R'
                        : (packageId == 2 && from_autorenewal == 0) ? 'Kabbik 6 months'
                        : (packageId == 20) ? 'Kabbik 6 months R'
                            : (packageId == 1 || packageId==19) ? 'Kabbik 30 Days R' : "";


            subscriptionDuration = packageId == 4 ? '2'
                : (packageId == 3 || packageId==21) ? '366'
                    : (packageId == 2 || packageId == 20) ? '181'
                        : (packageId == 1 || packageId==19) ? '31' : '31';

            isSubscription = packageId == 4 ? true
                : packageId == 3 ? false
                    : (packageId == 2 && from_autorenewal == 1) ? true
                        : (packageId == 20 ) ? true
                            : (packageId == 21 ) ? true
                                : (packageId == 2 && from_autorenewal == 0) ? false
                                    : (packageId == 1 || packageId==19) ? true : false;
        }
        if (subscriptionID == "") {
            return null;
        }

        //NEW CHANGES DEV-MOSARAF
        let payload = {
            'apiKey': ROBI_APIKEY,
            'username': ROBI_USERNAME,
            'spTransID': orderId,
            'description': subscriptionID,
            'amount': amount,
            'onBehalfOf': ROBI_ONBEHALF_OF,
            'purchaseCategoryCode': 'Video',
            'referenceCode': 'Video',
            'channel': 'WEB',
            'operator': 'ROBI',
            'taxAmount': '0',
            'callbackURL': ROBI_CALLBACK_URL,
            'isSubscription': isSubscription,
            'contactInfo': ROBI_CONTACT_INFO,
            'currency': 'BDT'
        };
        
        if (isSubscription) {
            payload = {
                ...payload,
                'subscriptionID': subscriptionID,
                'subscriptionName': subscriptionID,
                'subscriptionDuration': subscriptionDuration,
                'unSubURL': ROBI_UNSUBSCRIBE_URL,
            }
        }

        if (packageId == 4 || packageId == 1 || (packageId == 2 && from_autorenewal == 1)) {
            const fetchActualPrice = `SELECT rawPrice from subscription_packages WHERE subscriptionItemId = ? `;
            const price = await DB.query(fetchActualPrice, [packageId]);
            if (price) {
                payload['renewalCharge'] = price[0]['rawPrice'];

            }
            else {
                payload['renewalCharge'] = packageId == 4 ? '4' : packageId == 2 ? '250' : '50';
            }
        }
                const that = this
        try {
            const url = ROBI_AOC_Token_URL
                        var config = {
                method: 'POST',
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
            
            if (result.data.errorCode == "00") {
                const { aocTransID, aocToken } = result.data;
                
                if (bodyData.type == "Audiobook" || bodyData.type == "category" || bodyData.type == "quiz") {
                    
                    const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, email, phone, address, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method,  purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                    try {
                        await DB.query(storeLogInsertQuery, [
                            bodyData.userId,
                            bodyData.name,
                            bodyData.email,
                            bodyData.phone,
                            bodyData.address,
                            aocTransID,
                            aocToken,
                            "INITIALIZED",
                            "CREATED",
                            bodyData.amount,
                            bodyData.promo_code ?? "",
                            bodyData.source,
                            bodyData.platform,
                            "Robi",
                            bodyData.type,
                            bodyData.productId
                        ]);
                    //     const insertSql = `INSERT INTO robi_payment (aocTransID, aocToken, amount, packageId, userId, from_channel, status, from_source, promo_code, payload, orderId, subscriptionId, from_autorenewal)
                    //     VALUES (?,?,?,?,?,?,?,?,?, ?,?,?,?);`
                    // console.log("robi 6 time")
                    // const resultsInsertSql = await DB.query(insertSql, [aocTransID, aocToken, amount, bodyData?.productId, userId, from_channel, "INITIALIZED", from_source, promo_code, JSON.stringify(payload), orderId, subscriptionID, 0]);
                        return {
                            status: true,
                            aocTransID: aocTransID,
                            callBackUrl: `${ROBI_AOC_BILLING_URL}?aocToken=${aocToken}`
                        }
                    } catch (e) {
                        console.log(e,"5 time")
                        return {
                            "status": false,
                            "message": "Something went wrong"
                        }
                    }

                }

                 

                      if (bodyData.clickId && bodyData.pubId){
                    PaymentHelper.insertCpaMarketingRecord(userId, packageId, bodyData.clickId, bodyData.pubId, "Robi", amount,aocTransID);
                      }
                const insertSql = `INSERT INTO robi_payment (aocTransID, aocToken, amount, packageId, userId, from_channel, status, from_source, promo_code, payload, orderId, subscriptionId, from_autorenewal)
                VALUES (?,?,?,?,?,?,?,?,?, ?,?,?,?);`
                try {
                                        const resultsInsertSql = await DB.query(insertSql, [aocTransID, aocToken, amount, packageId, userId, from_channel, "INITIALIZED", from_source, promo_code, JSON.stringify(payload), orderId, subscriptionID, from_autorenewal]);
                                        if (resultsInsertSql) {
                                            }
                } catch (error) {
                    console.log(error);
                    return null;
                }
                return {
                    aocTransID,
                    redirectUrl: `${ROBI_AOC_BILLING_URL}?aocToken=${aocToken}`
                }
            }
            return result;

        } catch (error) {
            console.log(error)
            return null

        }
    }


    renewRobiSubscription = async () => {


        var successCount = 0;
        var faildCount = 0;


        const findRenewRecord = `SELECT * FROM robi_payment 
        WHERE status = 'SUCCEEDED' 
        AND from_autorenewal = 1  
        AND unsubscribeStatus IS NULL 
         AND (retry_block_at IS NULL OR retry_block_at < NOW() - INTERVAL 1 DAY) AND next_purchase_time < ?`;

        const insertWebhook = `INSERT INTO robi_webhook (userId, order_id, aoc_trans_id, status_code, error_message, package_id, amount) VALUES (?,?,?,?,?,?,?);`;

        var currentDateTime = Date.now();

        const queryRes = await DB.query(findRenewRecord, [currentDateTime]);

        for (let item of queryRes) {

            var orderId = this.makeSubscriptionId(8);
            let payload = {
                'apiKey': ROBI_APIKEY,
                'username': ROBI_USERNAME,
                'spTransID': orderId,
                'onBehalfOf': ROBI_ONBEHALF_OF,
                'purchaseCategoryCode': 'Video',
                'referenceCode': 'Video',
                'channel': 'WEB',
                'operator': 'ROBI',
                'taxAmount': '0',
                'unSubURL': ROBI_UNSUBSCRIBE_URL,
                'contactInfo': ROBI_CONTACT_INFO,
                'currency': 'BDT'
            };
            payload['description'] = item.subscriptionId ?? "";
            payload['subscriptionID'] = item.subscriptionId ?? "";
            payload['amount'] = item.packageId == 1 ? 50 : item.packageId == 2 ? 250 : item.packageId == 4 ? 5 : Number(item.amount);
            payload['msisdn'] = item.msisdn ?? "";
            if(item.package_id == 4  && item.amount=='4'){
                payload['amount'] = 4;
            }
            if (payload['amount'] == 0 || payload['subscriptionID'] == "" || payload['msisdn'] == "") continue;

            try {
                const url = ROBI_RENEW_SUBSCRIPTION_URL
                                var config = {
                    method: 'POST',
                    data: payload,
                    url,
                };
                const result = await axios(config).then(function (response) {
                    return response.data
                }).catch(function (error) {
                    return null;
                });

                try {
                    await DB.query(insertWebhook, [
                        item.userId,
                        orderId,
                        result.data.aocTransID,
                        result.data.errorCode,
                        result.data.errorMessage,
                        item.packageId,
                        result.data.totalAmountCharged
                    ]);
                }
                catch (e) { }

                if (!result) continue;
                if (result.data.errorCode == "00") {
                    successCount++;
                    var dayWillBeAdded = item.packageId == 4 ? 1 : item.packageId == 1 ? 30 : item.packageId == 2 ? 180 : 0;

                    var targetDate = new Date(currentDateTime + (dayWillBeAdded * 24 * 60 * 60 * 1000));
                    targetDate.setHours(23, 29, 0, 0);
                    var nextRenewalTime = targetDate.getTime();

                    const updateRobiPaymentSql = `UPDATE robi_payment SET renew_at = CURRENT_TIMESTAMP(),
                       next_purchase_time = ?, 
                       renewalStatus = ?,  
                       attempt_count = ?, 
                       latest_payload = ?,
                       last_aoc_trans_id = ?,
                       errorCode = ?, 
                       errorMessage = ?
                        WHERE id = ?`;

                    const updateUser = `
                        UPDATE users SET 
                            is_subscribed = ?, 
                            package_id = ?,
                            payment_method = ?, 
                            next_purchase_time = ?
                        WHERE id = ?
                    `;
                    await DB.query(
                        updateRobiPaymentSql,
                        [
                            nextRenewalTime,
                            result.data.transactionOperationStatus,
                            item.transactionOperationStatus = 'charged' ? 1 : (item.attempt_count + 1),
                            JSON.stringify(payload),
                            result.data.aocTransID,
                            "00",
                            "",
                            item.id
                        ]);

                    try {
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            item.userId
                        ]);

                        await PaymentHelper.insertUserPaymentLog(
                            item.userId,
                            findUsers[0].user_name,
                            findUsers[0].full_name,
                            item.packageId,
                            "Robi",
                            "Subscription",
                            0,
                            1,
                            "SUCCEEDED_PAYMENT",
                            1,
                            item.msisdn,
                            result.data.aocTransID,
                            payload.amount,
                            0,
                            0,
                            targetDate
                        );

                    } catch (e) {
                        console.log("Errrrrrrrrrrrrrror", e)
                    }

                    await DB.query(updateUser, [
                        1,
                        item.packageId,
                        'Robi',
                        nextRenewalTime,
                        item.userId
                    ]);

                }
                else if (result.data.errorCode == "AOC2002" || result.data.errorCode == "AOC2003") {
                    faildCount++;
                    const updateRobiPaymentSql = `UPDATE robi_payment SET
                           errorCode = ?,
                           renewalStatus = ?,  
                           latest_payload = ?,
                           unsubscribeStatus = ?,
                            errorMessage = ?
                        WHERE id = ?`;

                    await DB.query(updateRobiPaymentSql, [
                        result.data.errorCode,
                        "FAILED",
                        JSON.stringify(payload),
                        "UNSUBSCRIBED",
                        result.data.errorMessage,
                        item.id
                    ]);


                    try {
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            item.userId
                        ]);

                        await PaymentHelper.insertUserPaymentLog(
                            item.userId,
                            findUsers[0].user_name,
                            findUsers[0].full_name,
                            item.packageId,
                            "Robi",
                            "Subscription",
                            0,
                            1,
                            "UNSUBSCRIBED",
                            0,
                            item.msisdn,
                            item.aocTransID,
                            0,
                            0,
                            1,
                            null
                        );

                    } catch (e) {
                        console.log("Errrrrrrrrrrrrrror", e)
                    }


                }

                else if (result.data.errorCode == "AOC2004" || result.data.errorCode == "AOC2001") {
                    faildCount++;
                    const updateRobiPaymentSql = `UPDATE robi_payment SET errorCode = ?, 
                            renewalStatus = ?,  
                            latest_payload = ?,
                            errorMessage = ?,
                            attempt_count = ?,
                            retry_block_at = CURRENT_TIMESTAMP()
                    WHERE id = ?`;
                    await DB.query(updateRobiPaymentSql, [
                        result.data.errorCode,
                        "FAILED",
                        JSON.stringify(payload),
                        result.data.errorMessage,
                        item.attempt_count + 1,
                        item.id
                    ]);
                }
                else {
                    faildCount++;
                    const updateRobiPaymentSql = `
                        UPDATE robi_payment 
                        SET errorCode = ?, 
                        renewalStatus = ?,  
                        latest_payload = ?,
                         attempt_count = ?,
                         errorMessage = ? 
                        WHERE id = ?
                    `;
                    await DB.query(updateRobiPaymentSql, [
                        result.data.errorCode,
                        "FAILED",
                        JSON.stringify(payload),
                        item.attempt_count + 1,
                        result.data.errorMessage,
                        item.id
                    ]);

                }

            } catch (error) {
                console.log(error)
            }

        }

        return {
            "successCount": successCount,
            "faildCount": faildCount
        };

    }


    unsubscribeRobi = async (req, headersData) => {
        var userId = req.body.userId;
        var msisdn = req.body.msisdn;

        
        if (!userId || !msisdn || !req.body.packageId) {
            return false;
        }
        const selectQuery = 'SELECT * FROM robi_payment WHERE userId = ? AND msisdn = ? AND packageId = ? And unsubscribeStatus IS NULL order by created_at DESC;'

        const resultQuery = await DB.query(selectQuery, [userId, msisdn,  req.body.packageId]);
        if(resultQuery.length === 0){
            

            return {
                status: false,
                message: "Invoice not found"
            };
        }
     
                                  if (resultQuery && resultQuery.length > 0) {
            const payload = {
                'apiKey': ROBI_APIKEY,
                'username': ROBI_USERNAME,
                'spTransID': resultQuery[0].orderId,
                'operator': "ROBI",
                'subscriptionID': resultQuery[0].subscriptionId,
                'msisdn': resultQuery[0].msisdn,

            };

                        try {
                const url = ROBI_CANCEL_SUBSCRIPTION_URL
                                var config = {
                    method: 'POST',
                    data: payload,
                    url,
                };
                const result = await axios(config).then(function (response) {
                    return response.data
                }).catch(function (error) {
                                        // if (error.response) {
                    //     return StatusCheck.checkStatus(error.response.data.errorCode);
                    // }
                });

                if (result.data.errorCode == "00") {
                    const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, canceled_subscription = ? WHERE id = ?`;

                    const resultUpdateUser = await DB.query(sqlUpdateUser, [
                        true,
                        1,
                        userId,
                    ]);

                    const sqlUp = `UPDATE robi_payment SET unsubscribeStatus = ?, cancelled_at = CURRENT_TIMESTAMP()
                     WHERE id = ?`;
                    await DB.query(sqlUp, ["UNSUBSCRIBED", resultQuery[0].id]);

                    return {
                        message: "User Successfully Unsubscribed"
                    }
                }
                else {
                    
                    return {
                        message: result.data.errorMessage
                    }
                }
                return result.data;
            } catch (error) {
                console.log(error)
                return false
            }
        } else {
            return {
                message: "No Data Found"
            }
        }
    }




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

    giveAccessToQuiz=async(result)=>{
        
        if (result[0].promo_code === "QUIZ26WORLDCUP" || result[0].promo_code === "QUIZ26WORLDCUPNEXT") {
          let isToday=result[0].promo_code === "QUIZ26WORLDCUP";
          const today = new Date();

            const minDate = new Date("2026-06-12T00:00:00Z");

            const effectiveDate = today < minDate ? minDate : today;
          let nextDay = new Date(today);
          nextDay.setDate(today.getDate() + 1);
                    nextDay = nextDay < minDate ? minDate : nextDay;
    
          const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
    
            return `${year}-${month}-${day}`;
          };
          const quizSql = `
            INSERT INTO quiz_access (user_id, access_date, created_at, updated_at)
            VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
          `;
                   DB.query(quizSql, [result[0].userId||result[0].user_id, formatDate(isToday?effectiveDate:nextDay)])
      }
      }


    verifyPayment = async (aocTransID) => {
        const selectQuery = 'SELECT * FROM robi_payment WHERE aocTransID = ?;'
        let resultQuery = await DB.query(selectQuery, [aocTransID]);
                const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
        // console.log()
        const storeLogFound = `SELECT * from store_log WHERE payment_id = ?`;
        var nextPaymentDateTime;

        var extraUiInfo = {};

        var currentDateTime = new Date().valueOf()
        var someDate = new Date();


        if (resultQuery && resultQuery.length < 1) {
            resultQuery = await DB.query(storeLogFound, [
                aocTransID,
            ]);
            resultQuery.fromRent = true;
        }



                if (resultQuery) {
            const payload = {
                'apiKey': ROBI_APIKEY,
                'username': ROBI_USERNAME,
                'aocTransID': aocTransID
            }; 
            try {
                const url = ROBI_CHARGE_STATUS_URL
                                var config = {
                    method: 'POST',
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
                
                               

                // if (result.data.errorCode == "00" && result.data.transactionOperationStatus == "charged") {
                //     try {

                //         if (!resultQuery.fromRent) {

                //         }


                //     } catch (e) {
                //         console.log("Errrrrrrrrrrrrrror", e)
                //     }
                // }
                                if (resultQuery.fromRent == true && result.data.errorCode == "00" && result.data.transactionOperationStatus == "charged") 
                    // if(true)
                {
                        
                    const findAudiobook = `SELECT * from audiobooks where id = ? limit 1`;

                    const res = await DB.query(findAudiobook, [
                        resultQuery[0].product_id
                    ]);
                                        

                    extraUiInfo['title'] = "রেন্ট বুক (Book Rent)";
                    extraUiInfo['sub_title'] = `বইয়ের নাম: ${res[0].name}`;
                    extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${res[0].price}`;

                    const rows = await DB.query(
                        'SELECT * FROM store_log WHERE payment_id = ? ',
                        [aocTransID]
                    );

                    
                    const storeLogUpdateQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, status_message = ?  WHERE payment_id = ?`;

                                        if(rows[0].purchase_type?.toLowerCase()==='category'){
                         const findCategory = `SELECT * from categories where id = ? LIMIT 1;`;
                        //  if(result.data.msisdn!==false){
                            this.giveAccessToQuiz(resultQuery)
                        // }

                        const resCat = await DB.query(findCategory, [
                            resultQuery[0].product_id
                        ]);
                                                const insertCategory = `INSERT INTO purchased_category (user_id, category_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;

                         await DB.query(insertCategory, [
                          resultQuery[0].user_id,
                        resultQuery[0].product_id,
                          aocTransID,
                          resCat[0].rent_duration_day
                        ]);
                    }else if(rows[0].purchase_type?.toLowerCase()==='quiz'){

                    }else{
                                                await DB.query(
                        insertQuery, [
                        resultQuery[0].user_id,
                        resultQuery[0].product_id,
                        aocTransID,
                        res[0].rent_duration_in_day
                        ]);

                        await DB.query(storeLogUpdateQuery, [
                            1,
                            result.data.transactionOperationStatus,
                            "SUCCEEDED",
                            aocTransID,
                        ]);
                                            }
                    

                }
                
                
                else if (resultQuery.fromRent == true) {
                                        return false;
                }
                if((!(resultQuery[0]?.user_id || resultQuery[0]?.userId)) && (result.data?.msisdn)){
                                        let msisdn= [...result.data?.msisdn]?.splice(1,).join('');
                    let user  = await userModel.createOrReturn( 
                        msisdn,
                        'user',
                        'cpa',
                        null
                    )
                    // SELECT * FROM robi_payment WHERE aocTransID = ?;
                    let updateInvoice=`UPDATE robi_payment
                    SET userId = ?
                    WHERE aocTransID = ?
                    ;`
                    let updateCpa=`UPDATE cpa_marketing
                    SET user_id = ?
                    WHERE subscription_req_id = ?
                    ;`
                      
                     await DB.query(updateInvoice, [
                      user?.id,
                      aocTransID,
                    ]);
                    DB.query(updateCpa, [
                      user?.id,
                      aocTransID,
                    ]);
                                        resultQuery = await DB.query(selectQuery, [
                      aocTransID,
                    ]);
                }
                else if (result.data.errorCode == "00" && result.data.transactionOperationStatus == "charged") {
                                        
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
                    if (resultQuery[0].packageId != null && resultQuery[0].packageId == 4) {
                        numberOfDaysToAdd = 1
                    }
                    someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
                    someDate.setHours(23, 29, 0, 0);
                    nextPaymentDateTime = someDate.getTime();

                    var method = "Robi"
                    const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
                    await DB.query(sqlUpdateUser, [true, aocTransID, method, resultQuery[0].packageId, currentDateTime, nextPaymentDateTime, 0, resultQuery[0].userId]);
                                        const sqlUp = `UPDATE robi_payment SET status = ?, transactionOperationStatus = ?, next_purchase_time = ?, msisdn = ? WHERE aocTransID = ?`;
                    await DB.query(sqlUp, ["SUCCEEDED", result.data.transactionOperationStatus, nextPaymentDateTime, result.data.msisdn, aocTransID]);
                                    }
                else if (result.data.errorCode == "00" && result.data.transactionOperationStatus == "pending") {
                                        const sqlUp = `UPDATE robi_payment SET status = ?, transactionOperationStatus = ?, msisdn = ?, errorCode = ?, errorMessage = ? WHERE aocTransID = ?`;

                    await DB.query(sqlUp, ["INCOMPLETE", result.data.transactionOperationStatus, result.data.msisdn, result.data.errorCode, result.data.errorMessage, aocTransID]);
                                        return false
                } else {
                                        const sqlUp = `UPDATE robi_payment SET status = ?, transactionOperationStatus = ?, msisdn = ?, errorCode = ?, errorMessage = ? WHERE aocTransID = ?`;
                    await DB.query(sqlUp, ["INCOMPLETE", result.data.transactionOperationStatus, result.data.msisdn, result.data.errorCode, result.data.errorMessage, aocTransID]);
                                        return false
                }
                
                

                try {
                    const findUsersSql = `SELECT * from users where id = ?`;
                    const findUsers = await DB.query(findUsersSql, [
                        resultQuery[0].userId ?? resultQuery[0].user_id
                    ]);
                    
                    if (Object.keys(extraUiInfo).length === 0) {
                        extraUiInfo = null;
                    }

                    await PaymentHelper.insertUserPaymentLog(
                        resultQuery[0].userId ?? resultQuery[0].user_id,
                        findUsers[0].user_name,
                        findUsers[0].full_name,
                        resultQuery[0].packageId ?? resultQuery[0].product_id,
                        "Robi",
                        resultQuery.fromRent == true ? "Audiobook" : "Subscription",
                        1,
                        resultQuery.fromRent == true ? 0 : resultQuery[0].from_autorenewal,
                        "SUCCEEDED_PAYMENT",
                        1,
                        result.data.msisdn,
                        aocTransID,
                        resultQuery[0].amount,
                        resultQuery[0].promo_code,
                        0,
                        resultQuery.fromRent == true ? null : someDate,
                        null,
                        null,
                        extraUiInfo ? JSON.stringify(extraUiInfo) : null
                    );
                                    } catch (e) { 
                    console.log(e,"23232232323")
                }
                                if(result?.data !== false){
                    this.giveAccessToQuiz(resultQuery)
                }
                return result.data.msisdn;
            } catch (error) {
                console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeee", error)
                return false
            }
        } else {
            return false
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


    checkSubscriptionStatusRobi = async (req) => {
        var packageId = req.body.packageId;
        var subscriptionID = packageId == 4 ? 'KabbiqDailyRcrr'
            : packageId == 3 ? 'Kabbik 1 Year'
                : (packageId == 2 && from_autorenewal == 1) ? 'Kabbik 6 months R'
                    : (packageId == 2 && from_autorenewal == 0) ? 'Kabbik 6 months'
                        : packageId == 1 ? 'Kabbik 30 Days R' : "";
        let payload = {
            'apiKey': ROBI_APIKEY,
            'username': ROBI_USERNAME,
            'msisdn': req.body.msisdn,
            'operator': 'ROBI',
            'subscriptionID': subscriptionID
        };

        var url = ROBI_SUBSCRIPTIONSTATUS_URL;

        var config = {
            method: 'POST',
            data: payload,
            url,
        };
        const result = await axios(config).then(function (response) {
            return response.data
        }).catch(function (error) {
                        // if (error.response) {
            //     return StatusCheck.checkStatus(error.response.data.errorCode);
            // }
        });

        return result;
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



module.exports = new RobiModel