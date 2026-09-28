const DB = require('../db');
const axios = require('axios');
const moment = require('moment');


class CityPaymentModel {

    makeRefferenceId(length) {
        var result = "";
        var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        var setResult = "City-" + result;
        return setResult;
    }

    rentCreatePayment=async(bookId,userId,tokenRes)=>{
        try{
            const cityPaySql = `SELECT ab.* FROM audiobooks as ab 
            where ab.id=?;
            `;
            let packageData = await DB.query(cityPaySql,[bookId]);
            const amount = packageData?.[0]?.price  ;

            const referenceId = this.makeRefferenceId(10)+'-rent';


            const initiatePaymentUrl = process.env.CITY_INITIATE_PAYMENT_URL;

            const initiatePaymentPayload = {
                "transactionId": tokenRes.transactionId,
                "merchanRefNo": referenceId,
                "txnamount": amount
            };

            const cityInsertPaySql = `INSERT INTO store_log(user_id,transaction_id,payment_id,source,platform,amount,payment_method,purchase_type,product_id) VALUES (?,?,?,?,?,?,?,?,?)`;


            await DB.query(cityInsertPaySql, [userId,tokenRes.transactionId,referenceId,'city_app','city_app',amount,'city_touch','Audiobook',bookId]);
            
            return {
                "success": true,
                "data": initiatePaymentPayload
            };
        }catch(e){
            console.log(e)
        }
    }

    createPayment = async (req) => {
        try{
            const {promoCode,packageId,userId,bookId}=req.body;
        
            const authTokenUrl = process.env.CITY_TOKEN_API;

            const tokenPayload = {
                "loginname": "KABBIK",
                "login_password": process.env.CITY_PASSWORD
            };

            var config = {
                method: 'POST',
                data: tokenPayload,
                url: authTokenUrl,
            };
            const tokenRes = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {
                return null;
            });

            if (!tokenRes || tokenRes.status !== '100') {

                return null;
            }

            if(bookId!=null){
                return this.rentCreatePayment(bookId,userId,tokenRes)
            }
            
            const cityPaySql = `SELECT sp.*,p.* FROM subscription_packages as sp 
            LEFT JOIN promo as p on p.for_package=? AND p.promocode=?
            where sp.id=?;
            `;
            let packageData = await DB.query(cityPaySql,[packageId,promoCode,packageId]);
            const amount = packageData?.[0]?.rawPrice - packageData?.[0]?.reduce_price ;
            
            const referenceId = this.makeRefferenceId(10);


            const initiatePaymentUrl = process.env.CITY_INITIATE_PAYMENT_URL;

            const initiatePaymentPayload = {
                "transactionId": tokenRes.transactionId,
                "merchanRefNo": referenceId,
                "txnamount": amount
            };

            const cityInsertPaySql = `INSERT INTO city_bank_payment(request_payload,userId,subscriptionReferenceId,package_id,city_transection_id,amount) VALUES (?, ?,?,?,?,?)`;

            await DB.query(cityInsertPaySql, [JSON.stringify(req.headers),userId,referenceId,packageId,tokenRes.transactionId,amount]);

            return {
                "success": true,
                "data": initiatePaymentPayload
            };
        }catch(e){

        }

    }

    addDaysToTimestamp(days) {
        const msInDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
                return Date.now() + (days * msInDay);// returns in milliseconds
    }


    rentRedirectPayment=async(tokenRes,payload)=>{
                try{
            if(tokenRes?.txnStatus==='1' || tokenRes?.txnStatus===1){
            let prevPaymentLogSQL=`
                SELECT sl.* from store_log sl
                where sl.transaction_id=?
            `
            let prevPaymentData= await DB.query(prevPaymentLogSQL, [ payload.transactionId]);
                        const cityPaySql = `UPDATE  store_log SET  is_succeed= 1 where transaction_id=?`;
            
            const sqlUpdateUser = `INSERT INTO audiobooks_rent(user_id,audiobook_id,payment_id,is_purchased,purchased_at,expired_at) VALUES (?, ?,?,?,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY),DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
                        
            await Promise.all([
                DB.query(sqlUpdateUser, [
                    Number(prevPaymentData[0]?.user_id),
                    prevPaymentData[0]?.product_id,
                    payload.transactionId,
                    1,
                    0,
                    60,
                ]),
                DB.query(cityPaySql, [payload.transactionId]),
            ]);
		    return true;
            }else{
                const cityPaySql = `UPDATE  store_log SET  is_succeed= 0 where payment_id=?`;
                await DB.query(cityPaySql, [  payload.transactionId]);
            }
            return false;
        }catch(e){
            console.log(e)
            return false
        }
    }

     redirectPayment = async (req) => {
        try {
            const payload=req.body;
            const tokenPayload = {
                "loginname": "KABBIK",
                "login_password": process.env.CITY_PASSWORD,
                "citySecureToken":payload.transactionId
            };

            var config = {
                method: 'POST',
                data: tokenPayload,
                url: process.env.CITY_VALIDATE_API,
            };
            const tokenRes = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {
                return null;
            });
            if(payload.merchanRefNo?.endsWith('-rent')){
                return this.rentRedirectPayment(tokenRes,payload)
            }else if(tokenRes?.txnStatus==='1' || tokenRes?.txnStatus===1){
                let prevPaymentLogSQL=`
                SELECT cbp.*, sp.* from city_bank_payment cbp
                left join subscription_packages as sp on sp.subscriptionItemId=cbp.package_id
                    where cbp.city_transection_id=?
                    `
                    let prevPaymentData= await DB.query(prevPaymentLogSQL, [ payload.transactionId]);
                    const cityPaySql = `UPDATE  city_bank_payment SET  response_payload=? , payment_status='Successfull' where city_transection_id=?`;
                    
                    const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, payment_method = ?, package_id = ?, subscription_id = ?,  purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
                    
                    let currentDateTime = new Date().getTime();
                
                await Promise.all([
                    DB.query(sqlUpdateUser, [
                        true,
                        "city_touch",
                        prevPaymentData[0]?.package_id,
                        prevPaymentData[0]?.city_transection_id,
                        currentDateTime,
                        this.addDaysToTimestamp(prevPaymentData?.[0]?.days),
                        0,
                        Number(prevPaymentData[0].userId)
                    ]),
                    DB.query(cityPaySql, [JSON.stringify(payload),payload.transactionId]),
                ]);
		        return true;
            }else{
                const cityPaySql = `UPDATE  city_bank_payment SET  response_payload=? , payment_status='FAILED' where city_transection_id=?`;
                await DB.query(cityPaySql, [ JSON.stringify(req.body), payload.transactionId]);
            	return false;

            }
        } catch (e) {
            console.log(e,"city-payment-model redirectPayment")
            return false;
        }
    }



    validatePayment = async (req) => {
        try {
            const payload=req.body;
            const tokenPayload = {
                "loginname": "KABBIK",
                "login_password": process.env.CITY_PASSWORD,
                "citySecureToken":payload.transactionId
            };

            var config = {
                method: 'POST',
                data: tokenPayload,
                url: process.env.CITY_VALIDATE_API,
            };
            const tokenRes = await axios(config).then(function (response) {
                return response.data
            }).catch(function (error) {
                return null;
            });
            return tokenRes;
        } catch (e) {
            console.log(e,"city-payment-model redirectPayment")
            return false;
        }
    }


   cityPayTransectionReport = async (req) => {
        try {
            let fromDate = req.query.fromDate;
            let toDate = req.query.toDate;

            // If dates not provided ? default to last 7 days (including today)
            if (!fromDate || !toDate) {
                const endDate = moment().format("YYYY-MM-DD");
                const startDate = moment().subtract(6, "days").format("YYYY-MM-DD");
                fromDate = startDate;
                toDate = endDate;
            }

            const querySql = `
      SELECT 
        ctp.created_at, 
        ctp.subscriptionReferenceId, 
        ctp.city_transection_id, 
        ctp.amount,
        (ctp.amount * 0.01) AS bank_commission, 
        ctp.amount - (ctp.amount * 0.01) AS settlement_amount, 
        'Wondersoft Solution' AS marchant, 
        ctp.payment_status
      FROM city_bank_payment AS ctp
      WHERE DATE(CONVERT_TZ(ctp.created_at, 'UTC', 'Asia/Dhaka')) 
      BETWEEN ? AND ?;
    `;

            const reportRes = await DB.query(querySql, [fromDate, toDate]);

            return {
                success: true,
                message: "Successful",
                data: reportRes,
                dateRange: { fromDate, toDate },
            };
        } catch (e) {
            return {
                success: false,
                message: "Failed to fetch report",
                error: e.message,
            };
        }
    };


}

module.exports = new CityPaymentModel;