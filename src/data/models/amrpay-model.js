const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");
const axios = require("axios");
const {
  AMRPAY_PRODUCTIONURL,
  AMRPAY_STORE_ID_PRODUCTION,
  AMRPAY_SINGATURE_KEY_PRODUCTION,
  AMRPAY_REDIRECT_URL,
} = require("../../utils/constants");
const PaymentHelper = require("../../utils/payment-helper");

class AmrpayModel {
  makeSubscriptionId(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    var setResult = "KabbikAP" + result;
    return setResult;
  }

  createPaymentAmrpay = async (req) => {
    var {
      userId,
      name,
      fullName,
      email,
      phone,
      address,
      amount,
      productId,
      promo_code = "",
      currency = "BDT",
      source,
      platform,
      type,
      store_item,
    } = req.body;

    var tran_id = this.makeSubscriptionId(8);

    const data = {
      store_id: AMRPAY_STORE_ID_PRODUCTION,
      signature_key: AMRPAY_SINGATURE_KEY_PRODUCTION,
      cus_name: name && name.trim() ? name : "default",
      cus_email: email && email.trim() ? email : "default@gmail.com",
      cus_phone: phone && phone.trim() ? phone : "default",
      cus_add1: address && address.trim() ? address : "default",
      cus_add2: address && address.trim() ? address : "default",
      cus_city: address && address.trim() ? address : "default",
      cus_country: "Bangladesh",
      amount: amount,
      tran_id: tran_id,
      currency: currency,
      success_url: AMRPAY_REDIRECT_URL,
      fail_url: AMRPAY_REDIRECT_URL,
      cancel_url: AMRPAY_REDIRECT_URL,
      desc: "Kabbik Payment",
      opt_a: userId,
      opt_b: type,
      opt_c: productId,
      type: "json",
    };

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    var config = {
      method: "post",
      url: AMRPAY_PRODUCTIONURL,
      headers: headers,
      data: data,
    };
        try {
      if (type == "Course" || type == "Audiobook" || type == "category") {
        const checkAudioBookExistsQuery = `SELECT Count(*) as is_exist FROM audiobooks_rent  WHERE user_id = ? AND audiobook_id = ? AND expired_at > NOW()  AND is_purchased = 1`;

        const checkCategoryExistsQuery = `SELECT Count(*) as is_exist FROM purchased_category  WHERE user_id = ? AND category_id = ? AND expired_at > NOW()  AND is_purchased = 1`;

        const checkExistsQuery = `SELECT Count(*) as is_exist FROM course_purchase_table  WHERE user_id = ? AND course_id = ?`;
        let courseIsExsists;
        let sqlQuery;
        if(type == "Course"){
          sqlQuery = checkExistsQuery
        }else if(type=='category'){
          sqlQuery = checkCategoryExistsQuery;
        }else if(type == "Audiobook"){
          sqlQuery = checkAudioBookExistsQuery
        }
        courseIsExsists = await DB.query(
          sqlQuery,
          [userId, productId]
        );

        if (courseIsExsists[0].is_exist > 0) {
          return {
            status: false,
            message:
              type == "Course"
                ? "Course already purchased"
                : "Audiobook already purchased and date not expired",
          };
        }
      }
         
      const result = await axios(config)
        .then(function (response) {
                    return response.data;
        })
        .catch(function (error) {

          console.error("AmarPay API error:", error.message);
          console.error("Error response data:", error.response?.data);

          return null;

        });
      
      if (result.result == "true" && type == "subscription") {
        PaymentHelper.insertCpaMarketingRecord(userId, productId, req.body.clickId, req.body.pubId, "AamarPay", amount);
        

        result.callBackUrl = result.payment_url;
        result.status = true;
        const queryNewLogInsert = `
          INSERT INTO aamarPay (
            user_id,
            name,
            payment_type,
            currency,
            promo_code,
            amount,
            ststus,
            trafficSource,
            platform
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await DB.query(queryNewLogInsert, [
          userId,
          name ?? fullName,
          type,
          currency,
          promo_code ?? "",
          amount,
          "INITIALIZED",
          source ?? req.query.source ?? "",
          platform ?? req.query.platform ?? "",
        ]);
      } else if (result.result == "true") {
        result.callBackUrl = result.payment_url;
        result.status = true;

        const paymentMethod = "AamarPay";

        const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, email, phone, address, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method, store_item, purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        await DB.query(storeLogInsertQuery, [
          userId,
          name,
          email,
          phone,
          address,
          tran_id,
          tran_id,
          "INITIALIZED",
          "CREATED",
          amount,
          promo_code ?? "",
          source,
          platform,
          paymentMethod,
          JSON.stringify(store_item),
          type,
          productId,
        ]);
      }
      
      return result;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  successRedirectAmrpay = async (req) => {
    try {
      var returnValue = {
        success: true,
        fromSource: "kabbik",
        platform: "app",
      };

      var extraUiInfo = {};

      const querySearchLatestRecord = `
        SELECT * FROM aamarPay
        WHERE user_id = ?
          AND ststus = 'INITIALIZED'
          ${req.body.opt_b === "subscription"
          ? ""
          : "AND payment_type != 'subscription'"
        }
          AND DATE(created_at) = DATE(NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const resultSearchLatestRecord = await DB.query(querySearchLatestRecord, [
        req.body.opt_a,
      ]);
      if (resultSearchLatestRecord.length) {
        if (
          resultSearchLatestRecord[0].trafficSource === "Banglalink" &&
          resultSearchLatestRecord[0].platform === "app"
        ) {
          returnValue.fromSource = "Banglalink";
        }
        const queryUpdateLatestRecord = `
          UPDATE aamarPay
          SET trn_id = ?,
            card_type = ?,
            body_response = ?,
            ststus = ?
          WHERE id = ?
        `;
        const resultUpdateLatestRecord = await DB.query(
          queryUpdateLatestRecord,
          [
            req.body.mer_txnid,
            req.body.card_type,
            JSON.stringify(req.body),
            req.body.pay_status,
            resultSearchLatestRecord[0].id,
          ]
        );
      } else {
        const amrpayLogInsertQuery = `
          INSERT INTO aamarPay (
            user_id,
            name,
            trn_id,
            payment_type,
            currency,
            amount,
            card_type,
            body_response,
            ststus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await DB.query(amrpayLogInsertQuery, [
          req.body.opt_a,
          req.body.cus_name,
          req.body.mer_txnid,
          req.body.opt_b,
          req.body.currency,
          req.body.amount,
          req.body.card_type,
          JSON.stringify(req.body),
          req.body.pay_status,
        ]);
      }

      if (req.body.pay_status == "Successful") {

        if (req.body.opt_b == "subscription") {
          var someDate = new Date();
          var numberOfDaysToAdd = 6;

          if (req.body.opt_c != null && req.body.opt_c == "1") {
            numberOfDaysToAdd = 30;
          }
          if (req.body.opt_c != null && req.body.opt_c == "2") {
            numberOfDaysToAdd = 180;
          }
          if (req.body.opt_c != null && req.body.opt_c == "3") {
            numberOfDaysToAdd = 365;
          }
          var result444 = someDate.setDate(
            someDate.getDate() + numberOfDaysToAdd
          );
          var currentDateTime = new Date().valueOf();
          var nextPaymentDateTime = result444;
          var method = "AamarPay";
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
          await DB.query(sqlUpdateUser, [
            true,
            req.body.mer_txnid,
            method,
            req.body.opt_c,
            currentDateTime,
            nextPaymentDateTime,
            0,
            req.body.opt_a,
          ]);


          try {
            const findUsersSql = `SELECT * from users where id = ?`;
            const findUsers = await DB.query(findUsersSql, [
              req.body.opt_a
            ]);

            await PaymentHelper.insertUserPaymentLog(
              req.body.opt_a,
              findUsers[0].user_name,
              findUsers[0].full_name,
              req.body.opt_c,
              method,
              "Subscription",
              1,
              0,
              "SUCCEEDED_PAYMENT",
              1,
              null,
              req.body.mer_txnid,
              req.body.amount,
              resultSearchLatestRecord[0].promo_code,
              0,
              null
            );

          } catch (e) {
            console.log("Errrrrrrrrrrrrrror", e)
          }

          returnValue.success = true;
          return returnValue;
        }

        const storeLogFound = `SELECT * from store_log WHERE payment_id = ?`;

        var resultQuery = await DB.query(storeLogFound, [req.body.mer_txnid]);

        if (resultQuery.length < 1) {
          returnValue.success = false;
          return returnValue;
        } else if (resultQuery[0].purchase_type == "Audiobook") {

          const findAudiobook = `SELECT * from audiobooks where id = ? limit 1`;

          const res = await DB.query(findAudiobook, [
            resultQuery[0].product_id
          ]);

          extraUiInfo['title'] = "রেন্ট বুক (Book Rent)";
          extraUiInfo['sub_title'] = `বইয়ের নাম: ${res[0].name}`;
          extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${res[0].price}`;

          const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
          const insertAudioBook = await DB.query(insertQuery, [
            resultQuery[0].user_id,
            resultQuery[0].product_id,
            req.body.mer_txnid,
            res[0].rent_duration_in_day
          ]);

        } else if (resultQuery[0].purchase_type == "Course") {
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


        } else if (resultQuery[0].purchase_type == "store") {
          const insertToStoreOrderTable = `INSERT INTO store_order (user_id, product_id, order_id, amount) VALUES ?`;
          let values = [];

          for (var item of JSON.parse(resultQuery[0].store_item)) {
            values.push([
              resultQuery[0].user_id,
              item.id,
              resultQuery[0].product_id,
              item.offer_price,
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
          req.body.mer_txnid,
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
            method,
            resultQuery[0].purchase_type == "store" ? "Store"
              : resultQuery[0].purchase_type == "category" ? "Category"
                : resultQuery[0].purchase_type == "Course" ? "Course" :
                  resultQuery[0].purchase_type == "Audiobook" ? "Audiobook" : null,
            1,
            0,
            "SUCCEEDED_PAYMENT",
            0,
            null,
            req.body.mer_txnid,
            req.body.amount,
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

        returnValue.success = true;
        return returnValue;
      } else {
        const storeLogInsertQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, status_message = ?  WHERE payment_id = ?`;
        await DB.query(storeLogInsertQuery, [
          0,
          "Failed",
          "Failed",
          req.body.mer_txnid,
        ]);

        returnValue.success = false;
        return returnValue;
      }
    } catch (error) {
      console.error(error);
      returnValue.success = false;
      return returnValue;
    }
  };
}

module.exports = new AmrpayModel();
