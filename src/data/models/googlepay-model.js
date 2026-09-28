const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');
const axios = require('axios');
const StatusCheck = require('../../utils/status-code-check');
const GlobalTask = require('../../utils/global-tasker');

class GooglepayModel {
    tableName = 'bkash';
    subscriptionListTableName = 'subscription_packages';

    getGooglepaySubscriptionList = async (req) => {
        try {

            const sql = `
              SELECT * FROM kabbik.subscription_packages
              ${!req.query.development ? "WHERE status = 1" : ""}
	      AND forDomain is NULL
              ORDER BY priority
            `;
            const result = await DB.query(sql);
                        // const result = await DB.query(sql);
            GlobalTask.insertLogsOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "GetSubscriptionList",
                endpoint: "/v3/googlepay/googlepay_subscription_list",
                forTask: "Subscription",
                source: req.query.source,
                platform: req.query.platform,
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });

                        if (result) {

                for (var v of result) {
                    v.excluded_payment_methods = JSON.parse(v.excluded_payment_methods);
                }

                return result;
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }


    getGooglepaySubscriptionListV2 = async (req) => {
        try {
            const countryAccess = req.body.countryAccess;

            let domain = req.query.domain;
            let result = [];
            let sql;
            if (req.body.from_microsite === true) {
                sql = `
              SELECT * 
          FROM kabbik.subscription_packages WHERE (country_access = 'G' OR country_access = ? ) AND for_bkash_microsite = '1'
              ORDER BY priority
            `;
            }
            else {
            sql = `
              SELECT *, CASE WHEN ${countryAccess == 'BD'}
              AND is_free_trail = '1' THEN true ELSE false
              END AS is_free_trial_dialog 
          FROM kabbik.subscription_packages
              ${!req.query.development ? `WHERE status = 1 AND (country_access = 'G' OR country_access = ? ) AND ${domain ? ` forDomain like '%${domain}%' ` : 'forDomain is NULL'}` : ""}
              ORDER BY priority
            `;

            }
            result = await DB.query(sql, [countryAccess]);

            if (result && result.length > 0) {

                for (var v of result) {
                    v.excluded_payment_methods = JSON.parse(v.excluded_payment_methods);
                    v.benefit = JSON.parse(v.benefit);
                }

                return result;
            }
            return undefined;

        } catch (e) {
            console.log("Errrrrrrrrrrrrrrrrrrrrrrrrrror", e)
            return undefined;
        }
    }



    getGooglepaySubscriptionItem = async (req) => {
        try {

            const sql = `SELECT * FROM kabbik.subscription_packages  where id = ? order by subscriptionItemId`;
            const result = await DB.query(sql, [req.query.id]);
                        // const result = await DB.query(sql);
            GlobalTask.insertLogsOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "GetSubscriptionList",
                endpoint: "/v3/googlepay/googlepay_subscription_list",
                forTask: "Subscription",
                source: req.query.source,
                platform: req.query.platform,
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });

                        if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    findByUserProductID = async (userId, productId) => {
        try {

            const sql = `SELECT * FROM kabbik.users WHERE id = ? AND package_id = ?`;
            const result = await DB.query(sql, [userId, productId]);
                        // const result = await DB.query(sql);


                        if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    googlepayCreatePurchase = async (req) => {
        try {

            const {
                userId, username, orderId, packageName, productId, purchaseTime, purchaseState, purchaseToken, quantity, acknowledged, packageId
            } = req.body;



            var someDate = new Date();
            var numberOfDaysToAdd = 6;
            if (packageId != null && packageId == 1) {
                numberOfDaysToAdd = 30
            }
            if (packageId != null && packageId == 2) {
                numberOfDaysToAdd = 180
            }
            if (packageId != null && packageId == 3) {
                numberOfDaysToAdd = 365
            }

            var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
            var currentDateTime = new Date().valueOf()
            var nextPaymentDateTime = result444
            
            const insertSql = 'INSERT INTO googlepay_invoice (userId, username, orderId, packageName, productId, purchaseTime, purchaseState, purchaseToken, quantity, acknowledged, packageId) VALUES (?, ?, ? ,? ,? ,? ,? ,? ,? ,?, ?);'
            // try {
            const result = await DB.query(insertSql, [userId, username, orderId, packageName, productId, purchaseTime, purchaseState, purchaseToken, quantity, acknowledged, packageId]);
            // if (resultsInsertSql) {
            //     console.log("Updated")
            // }
            // } catch (error) {
            //     console.log(error);
            // }
                        if (result) {
                // const updateResult = updateUserWithGooglepay(packageId ,true,"Googlepay",purchaseTime,orderId,username)

                const sql = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time = ?, next_purchase_time = ?, subscription_id = ? WHERE id = ?`;

                const resultnew = await DB.query(sql, [packageId, true, "Googlepay", currentDateTime, nextPaymentDateTime, orderId, username]);

                // return result;
                if (resultnew) {
                    // const updateResult = updateUserWithGooglepay(packageId ,true,"Googlepay",purchaseTime,orderId,username)
                    return resultnew;
                } else {
                    return undefined;
                }
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    googlepaySubscriptionUpdateUser = async (req) => {
        try {

            const {
                username, orderId, purchaseTime, packageId, paymentMethod, isSubscribed
            } = req.body;

                        // var someDate = new Date();
            //     var numberOfDaysToAdd = 6;
            //     if (result2[0].package_id!=null && result2[0].package_id ==1){
            //         numberOfDaysToAdd = 30
            //     }
            //     if (result2[0].package_id!=null && result2[0].package_id ==2){
            //         numberOfDaysToAdd = 7
            //     }
            //     if (result2[0].package_id!=null && result2[0].package_id ==3){
            //         numberOfDaysToAdd = 180
            //     }
            //     var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
            //     var currentDateTime = new Date().valueOf() 
            //     var nextPaymentDateTime = result444
            const sql = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time = ?, subscription_id = ? WHERE id = ?`;
            // try {
            const result = await DB.query(sql, [packageId, isSubscribed, paymentMethod, purchaseTime, orderId, username]);
            // if (resultsInsertSql) {
            //     console.log("Updated")
            // }
            // } catch (error) {
            //     console.log(error);
            // }

                        if (result) {
                // const updateResult = updateUserWithGooglepay(packageId ,true,"Googlepay",purchaseTime,orderId,username)
                return result;
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }


    updateUserWithGooglepay = async (
        package_id,
        is_subscribed,
        payment_method,
        purchase_time,
        subscription_id,
        id
    ) => {


        var someDate = new Date();
        var numberOfDaysToAdd = 6;
        if (package_id != null && package_id == 1) {
            numberOfDaysToAdd = 30
        }
        if (package_id != null && package_id == 2) {
            numberOfDaysToAdd = 180
        }
        if (package_id != null && package_id == 3) {
            numberOfDaysToAdd = 365
        }

        var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
        var currentDateTime = new Date().valueOf()
        var nextPaymentDateTime = result444
        const sql = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time = ?, next_purchase_time = ?, subscription_id = ? WHERE id = ?`;

        const result = await DB.query(sql, [package_id, is_subscribed, payment_method, currentDateTime, nextPaymentDateTime, subscription_id, id]);

        return result;
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

}



module.exports = new GooglepayModel