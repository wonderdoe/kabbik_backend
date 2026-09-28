const constants = require('./constants')
const coreUtils = require('./core-utils')
const DB = require("../data/db");
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
const PaymentModel = require('../data/models/payment-model');
const rewardModel = require('../data/models/reward-model');
const ReferController = require('../controllers/refer-controller');


var http = require('follow-redirects').http

module.exports = class PaymentHelper {

    // static async getToken(){
    //     const res = await axios.post(
    //         `${constants.SHURJO_BASE_URL}/get_token`,
    //         {
    //             "username": "sp_sandbox",
    //             "password": "pyyk97hu&6u6"
    //         },
    //         {
    //             headers: {
    //                 'Content-Type': 'application/json'
    //             },
    //         }
    //     );
    //     return res
    // }
    static generateOrderId() {
        const orderId = uuidv4()
        return orderId
    }

    static async insertUserPaymentLog(
        userId, userName, fullName, packageId,
        paymentMethod, purchaseType, isFirstPayment, isRecurring,
        paymentStatus, isSubscribed, payer, subscriptionId, amount,
        promoCode, isCancelled, nextPaymentDate, platform, source, extraUiInfo) {
        const userPaymentLogSql = 'CALL create_user_payment_log(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        try {
            await DB.query(userPaymentLogSql, [
                userId,
                userName,
                fullName,
                packageId,
                paymentMethod,
                purchaseType,
                isFirstPayment,
                isRecurring,
                paymentStatus,
                isSubscribed,
                payer,
                subscriptionId,
                amount,
                promoCode,
                isCancelled,
                nextPaymentDate,
                platform || "Kabbik",
                source || "N/A"
            ]);


            if (purchaseType.toLowerCase() === 'audiobook' || purchaseType.toLowerCase() === 'category' || purchaseType.toLowerCase() === "rent") {
                rewardModel.insertEarningPoint(userId, 5, extraUiInfo);
                if (promoCode != null && promoCode != '') {
                    DB.query(`CALL affiliate_earn_log_insert(?,?,?,?)`, [promoCode, userId, 'rent', packageId]).catch((e) => { });
                }
            } else if (purchaseType.toLowerCase() === 'subscription' && isCancelled != 1 && isFirstPayment == 1) {

                this.updateRecordForSuccessfulPayment(userId, packageId);

                const taskId = packageId == 4 ? 13 :
                    packageId == 1 ? 14 : packageId == 2 ? 15 :
                        packageId == 3 ? 16 : null;


                var additionalUiInfo = {};
                additionalUiInfo['title'] = "সাবস্ক্রিপশন";
                additionalUiInfo['sub_title'] = `প্রযোজ্য প্যাকেজ: ${packageId == 4 ? 'Daily' :
                    packageId == 1 ? 'Monthly' : packageId == 2 ? 'Half-Yearly' :
                        packageId == 3 ? 'Yearly' : null} Subscription`;
                additionalUiInfo['short_description'] = `চার্জ: BDT.${amount}`;

                rewardModel.insertEarningPoint(userId, taskId, JSON.stringify(additionalUiInfo));

                if (promoCode != null && promoCode != '') {
                    const referUserSql = `SELECT * from users where refer_code = ? limit 1`;
                    const referUser = await DB.query(referUserSql, [promoCode]);
                    if ((referUser && referUser.length > 0) && (Number(packageId) !== 4)) {
                        ReferController.insertReferEarnLog(referUser[0].id, userId, promoCode, 20, packageId);
                    } else {
                        DB.query(`CALL affiliate_earn_log_insert(?,?,?,?)`, [promoCode, userId, 'Subscription', packageId]).catch((e) => { });
                    }
                }
            }

            return true;
        } catch (e) {
            console.log("Insert Log Error ", e)
            return true;
        }
    }

    static async insertCpaMarketingRecord(userId, productId, clickedId, publisherId, paymentMethod, amount,subscription_req_id) {
        try {
            await DB.query('CALL insert_cpa_marketing_record (?, ?, ?, ?, ?, ?,?)', [userId, productId, clickedId, publisherId, paymentMethod, amount,subscription_req_id]);
        } catch (e) {
            console.log("Insert Log Error ", e)
        }
    }
static async updateRecordForSuccessfulPayment(userId, productId) {
    try {
        // Find the latest record less than 10 minutes old
        const findCpaSql = `
            SELECT id, click_id, pub_id
            FROM cpa_marketing
            WHERE user_id = ?
              AND product_id = ?
              AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) < 10
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const rows = await DB.query(findCpaSql, [userId, productId]); // await the query
        if (rows && rows.length > 0) {
            const record = rows[0];

            // Update the record
            await DB.query(`
                UPDATE cpa_marketing
                SET is_succeeded = 1
                WHERE id = ?
            `, [record.id]);

            // Send postback
            const notifyUrl = `http://m.mobplus.net/c/p/bac74d0d61af40308aa10710d2fcf377?txid=${record.click_id}`;
            const res = await axios.get(notifyUrl);
                                }

    } catch (e) {
        console.log("Update Record Error:", e);
    }
}

    static async insertPayment(paymentdata, userId, audioBookId) {
        let sp_massage = "";
        let transaction_status = "";
        if (audioBookId == null) {
            audioBookId = 0
        }
        if (paymentdata) {
            const result = await PaymentModel.createPayment(paymentdata.sp_order_id, paymentdata.customer_order_id, paymentdata.amount, paymentdata.currency, paymentdata.customer_name, paymentdata.phone_no, paymentdata.customer_address, paymentdata.customer_city, sp_massage, transaction_status, userId, audioBookId);
        }
    }

    static async insertPaymentSubscribe(paymentdata, userId, audioBookId, packageId, t_of_payment, trafficSource, platform) {
                        let sp_massage = "";
        let transaction_status = "";
        if (audioBookId == null) {
            audioBookId = 0
        }
        if (paymentdata) {
            const result = await PaymentModel.createPaymentSubscription(paymentdata.sp_order_id, paymentdata.customer_order_id, paymentdata.amount, paymentdata.currency, paymentdata.customer_name, paymentdata.phone_no, paymentdata.customer_address, paymentdata.customer_city, sp_massage, transaction_status, userId, audioBookId, packageId, t_of_payment, trafficSource, platform);
        }
    }

    // static async updatePayment(paymentData){
    //     if (paymentData) {
    //         const result = await PaymentModel.updatePayment(paymentData.sp_massage, paymentData.transaction_status);
    //     }
    // }

    static async handlePaymentCallback(orderId) {
        //console.log("hello: " + orderId)
        try {
            const response = await axios.post(
                `${constants.SHURJO_BASE_URL}/get_token`,
                {
                    "username": "sp_sandbox",
                    "password": "pyyk97hu&6u6"
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            );
            if (response.status == 200) {
                let Gtoken = response.data.token;
                //console.log("in payment helper gtok: "+ Gtoken)
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
                        //console.log(secondResponse.data[0])
                        const paymentdata = secondResponse.data[0]
                        //console.log(paymentdata)
                        if (paymentdata.id) {
                            //console.log("working" + paymentdata.id)
                            const result = await PaymentModel.updatePayment(paymentdata.order_id, paymentdata.sp_code)
                            //console.log(result)
                        }
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
}