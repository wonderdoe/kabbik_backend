const DB = require("../data/db");
const rewardModel = require('../data/models/reward-model');
const ReferController = require('../controllers/refer-controller');
const axios = require('axios').default;

module.exports = class PaymenLogUtils {

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
                 if(promoCode != null && promoCode != ''){
                   DB.query(`CALL affiliate_earn_log_insert(?,?,?,?)`, [promoCode, userId, 'rent', packageId]).catch((e) => {});
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
                     DB.query(`CALL affiliate_earn_log_insert(?,?,?,?)`, [promoCode, userId, 'Subscription', packageId]).catch((e) => {});
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


}