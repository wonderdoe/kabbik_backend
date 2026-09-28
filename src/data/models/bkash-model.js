const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");
const axios = require("axios");
const StatusCheck = require("../../utils/status-code-check");
const {
  DHAKA_TZ,
  calendarDateInZone,
  addCalendarDaysInZone,
  subscriptionExpiryDateInZone,
} = require("../../utils/date-utils");

const {
  APPKEY_BKASH_ONETIME,
  APP_SECRET_BKASH_ONETIME,
  USERNAME_BKASH_ONETIME,
  PASSWORD_BKASH_ONETIME,
  URL_GRANT_TOKEN_BKASH_ONETIME,
  URL_CREATE_PAYMENT_BKASH_ONETIME,
  URL_EXECUTE_PAYMENT_BKASH_ONETIME,
  URL_PAYMENT_STATUS_BKASH_ONETIME,
  URL_REDIRECT_BKASH_ONETIME,
  URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase,
  URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE,
  URL_BKASH_REDIRECT,
  URL_BKASH_REDIRECT_BKASHAPP,
  URL_BKASH_REDIRECT_MC,
  URL_BKASH_REDIRECT_BKASH_MICROSITE,
  URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE,
} = require("../../utils/constants");
const GlobalTask = require("../../utils/global-tasker");
const MyblModel = require("./mybl-model");

const PaymenLogUtils = require("../../utils/payment_log_utils");
const { createOrReturn } = require("./user-model");

const normalizeEbookOrderId = (storeItem) => {
  if (storeItem == null || storeItem === "") return storeItem;
  const raw = String(storeItem).trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
    } catch (_) {
      return raw.slice(1, -1);
    }
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
  } catch (_) {}
  return raw;
};

const buildEbookGatewayResponseFromLog = (log, paymentId, deliveryStatus) => ({
  payment_id: paymentId,
  status: log.transaction_status || "Completed",
  transaction_id: log.transaction_id,
  status_message: log.status_message || "Payment confirmed",
  delivery_status: deliveryStatus,
  amount: log.amount,
  promo_code: log.promo_code,
  source: log.source,
  platform: log.platform,
  payment_method: log.payment_method || "Bkash",
  purchase_type: log.purchase_type,
  enrollment_id: log.enrollment_id,
});

const resolveEbookFulfillDeliveryStatus = (log, executePayload) => {
  if (
    Number(log?.is_succeed) === 1 ||
    String(log?.delivery_status || "").toLowerCase() === "delivered"
  ) {
    return "Success";
  }

  if (!executePayload || typeof executePayload !== "object") {
    return "Failed";
  }

  const statusCode = String(executePayload.statusCode ?? "");
  const transactionStatus = String(executePayload.transactionStatus ?? "");
  const statusMessage = String(executePayload.statusMessage ?? "");

  if (statusCode === "0000") return "Success";
  if (statusCode === "2064" || /already.*execut/i.test(statusMessage)) {
    return "Success";
  }
  if (transactionStatus === "Completed") return "Success";

  return transactionStatus || "Failed";
};

const userModel = require("./user-model");
const HttpException = require("../../utils/httpexception-utils");

class BkashModel {
  tableName = "bkash";

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
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturn = async (userName, fullName, authSrc, imageUrl) => {
      const sql = "CALL create_or_return_user(?, ?, ?, ?)";
      try {
        const results = await DB.query(sql, [
          userName,
          fullName,
          authSrc,
          imageUrl,
        ]);
        if (results) {
          // sp returns extra data 2d array, need the first one
          return results[0][0];
        }
        return undefined;
      } catch (e) {
        console.log(e)
        LoggerError.log(e);
        return undefined;
      }
    };

  paymentBkashNotification = async (headerData, bodyData) => {

    var headerStr = JSON.stringify(headerData);
    var bodyStr = JSON.stringify(bodyData);

    const insertToWebhookErrorLog = `INSERT INTO bkash_webhook_error_log(subscriptionRequestId, error_details, header, body) VALUES(?, ?, ?, ?)`;
    const userIdFromInvoice = `SELECT userId, package_id, payer, bkash_subscription_type, is_free_trial,
                               promoCode, source, platform FROM bkash_invoice WHERE subscriptionRequestId = ?
    `;

    let userIdFromInvoiceResult;
    try {
      userIdFromInvoiceResult = await DB.query(userIdFromInvoice, [
        bodyData.subscriptionRequestId,
      ]);
     

     if((!userIdFromInvoiceResult?.[0]?.userId) || (Number(userIdFromInvoiceResult?.[0]?.userId)===2820)){        
        let user  = await this.createOrReturn( 
        `88${bodyData?.payer}`,
        'user',
        'cpa',
        null)
        let updateInvoice=`UPDATE bkash_invoice
        SET userId = ?
        WHERE subscriptionRequestId = ?
        ;`
                    
        userIdFromInvoiceResult = await DB.query(updateInvoice, [
          user?.id,
          bodyData.subscriptionRequestId,
        ]);
        let updateCpa=`UPDATE cpa_marketing
          SET user_id = ?
          WHERE subscription_req_id = ?
        ;`
        DB.query(updateCpa, [
          user?.id,
          bodyData.subscriptionRequestId,
        ]);

        userIdFromInvoiceResult = await DB.query(userIdFromInvoice, [
          bodyData.subscriptionRequestId,
        ]);
        
      }
    } catch (e) {console.log(e,"first,paymentBkashNotification") }
    try {
      const signature = headerData["x-signature"];
      if (signature) {

        const sql = `INSERT INTO bkash_webhook(
        subscriptionRequestId, paymentId, paymentStatus, subscriptionId, subscriptionStatus, 
        trxId, is_free_trial, amount, reverseTrxId, reversTrxDate, cancelledBy, dueDate, nextPaymentDate, trxDate, firstPayment, signature, 
        header_response, body_response, type)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;

        const sqlUp = `UPDATE bkash_invoice SET subscribed = ?, payer = ? WHERE subscriptionRequestId = ?`;


        const fromFreeTrial = (userIdFromInvoiceResult?.[0]?.bkash_subscription_type === 'BASIC' && bodyData?.subscriptionStatus === 'SUCCEEDED');

        const paymentStatus = (bodyData?.paymentStatus == null && fromFreeTrial) ? "SUCCEEDED_PAYMENT" : bodyData?.paymentStatus;

        const queries = [
          DB.query(sql, [
            bodyData.subscriptionRequestId,
            bodyData.paymentId,
            paymentStatus,
            bodyData.subscriptionId,
            bodyData.subscriptionStatus,
            bodyData.trxId,
            userIdFromInvoiceResult?.[0]?.is_free_trial ?? 0,
            bodyData.amount ?? 0,
            bodyData.reverseTrxId,
            bodyData.reversTrxDate,
            bodyData.cancelledBy,
            bodyData.dueDate,
            bodyData.nextPaymentDate,
            bodyData.trxDate,
            bodyData.firstPayment,
            headerData["x-signature"],
            bodyStr,
            headerStr,
            headerData.type,
          ])
        ];
        if (paymentStatus === "SUCCEEDED_PAYMENT") {
          queries.push(DB.query(sqlUp, [paymentStatus == "SUCCEEDED_PAYMENT" ? "1" : "0", bodyData.payer, bodyData.subscriptionRequestId]));
        }
        try {
          await Promise.all(queries);

        } catch (_) { }

        var dateObj = new Date(bodyData.nextPaymentDate);
        dateObj.setHours(23, 59, 0, 0);
        var nextPaymentDateTime = dateObj.getTime();

        var currentDateTime = new Date().getTime();

        if (bodyData.paymentStatus == "SUCCEEDED_PAYMENT" || fromFreeTrial) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, payment_method = ?, package_id = ?, subscription_id = ?,  purchase_time = ?,  next_purchase_time = ?, is_free_trial = ?, canceled_subscription = ? WHERE id = ?`;
          const isUserInFreTrial =
            (bodyData?.paymentStatus === undefined || bodyData?.paymentStatus === null) &&
            fromFreeTrial;
          try {
            await DB.query(sqlUpdateUser, [
              true,
              "bKash",
              userIdFromInvoiceResult[0].package_id,
              bodyData.subscriptionRequestId,
              currentDateTime,
              nextPaymentDateTime,
              isUserInFreTrial,
              0,
              Number(userIdFromInvoiceResult[0].userId),
            ]);
          } catch (_) { }

          //mybl webhook part
          try {
            var recurringData = userIdFromInvoiceResult[0]
            if (recurringData.source == "Banglalink" && recurringData.platform == "app") {
              MyblModel.sendWebhook({
                userId: userIdFromInvoiceResult[0].userId || "",
                payment_method: "bkash_recurring",
                msisdn: `${userIdFromInvoiceResult[0].payer}` || "",
                amount: bodyData.amount || 0,
                transaction_id: recurringData.subscriptionRequestId || "",
                transaction_time: Date.now(),
                status: "Success",
                remarks: "",
                reason: recurringData.package_id || "",
                others_data: "",
              });
            }
          } catch (_) { }

          try {
            const findUsersSql = `SELECT * from users where id = ?`;
            const findUsers = await DB.query(findUsersSql, [
              userIdFromInvoiceResult[0].userId
            ]);

             PaymenLogUtils.insertUserPaymentLog(
              userIdFromInvoiceResult[0].userId,
              findUsers[0].user_name,
              findUsers[0].full_name,
              userIdFromInvoiceResult[0].package_id,
              "Bkash",
              "Subscription",
              bodyData.firstPayment ?? 0,
              1,
              "SUCCEEDED_PAYMENT",
              1,
              userIdFromInvoiceResult[0].payer,
              bodyData.subscriptionRequestId,
              bodyData.amount,
              userIdFromInvoiceResult[0].promoCode,
              0,
              bodyData.nextPaymentDate
            );

          } catch (e) {
            console.log("Errrrrrrrrrrrrrror", e)
          }

        } else if (bodyData.subscriptionStatus == "CANCELLED") {
          const findUsersSql = `SELECT * from users where id = ?`;
          const resultUser = await DB.query(findUsersSql, [
            userIdFromInvoiceResult[0].userId
          ]);
          const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE id = ?`;
          await DB.query(sqlUpdateUser, [
            1,
            userIdFromInvoiceResult[0].userId,
          ]);

           PaymenLogUtils.insertUserPaymentLog(
            resultUser[0].id,
            resultUser[0].user_name,
            resultUser[0].full_name,
            resultUser[0].package_id,
            "Bkash",
            "Subscription",
            0,
            1,
            "UNSUBSCRIBED",
            0,
            resultUser[0].payer,
            resultUser[0].subscriptionRequestId,
            0,
            null,
            1,
            null
          );

        }

        return {
          "success": true,
          "message": "Webhook successfully inserted"
        };

      } else {
        DB.query(insertToWebhookErrorLog, [
          bodyData.subscriptionRequestId,
          "No Signature available",
          headerStr,
          bodyStr,
        ]);
        return {
          "success": false,
          "message": "No Signature available"
        };
      }
    } catch (e) {

      DB.query(insertToWebhookErrorLog, [
        bodyData.subscriptionRequestId,
        JSON.stringify(e),
        headerStr,
        bodyStr,
      ]);

      return {
        "success": false,
        "message": `Failed to insert: ${e.message || e}`
      }
    }
  };

  paymentBkashNotificationSandboxAndProduction = async (
    headerData,
    bodyData,
    fromEndpoint
  ) => {
    var type = "Nothing";
    try {
      if (bodyData.Type != null) {
        type = bodyData.type;
      } else {
        type = "Not Mentioned";
      }

      // console.log("Webhook Body");
      // console.log("------------Webhook Body-----------------");
      // console.log(bodyData);
      // console.log("------------Webhook Body-----------------");
      var headerStr = JSON.stringify(headerData);
      var bodyStr = JSON.stringify(bodyData);
      // console.log(bodyData);

      const sql = `INSERT INTO bkash_webhook_test(bodyData, headerData, fromEndpoint)
                    VALUES(?, ?, ?);`;
      var result = await DB.query(sql, [bodyStr, headerStr, fromEndpoint]);
    } catch (e) {
      console.log(e);
      return undefined;
    }
  };

  paymentBkashNotificationTest = async (headerData, bodyData) => {
    var type = "Nothing";
    try {
      var headerStr = JSON.stringify(headerData);
      var bodyStr = JSON.stringify(bodyData);


      // if(bodyData.type == "SubscriptionConfirmation"){
      //     type= bodyData.type
      // }else{
      //     type= bodyData.type
      // }
    } catch (e) {
      console.log(e);
      return undefined;
    }
  };

  //
  bkashPaymentNotify = async (userId) => {
    var sql1 = "select id, is_subscribed from users where id = ?";
    //console.log(`userid : ${userId}`);

    try {
      const result1 = await DB.query(sql1, userId);
      const is_subscribed = result1[0].is_subscribed;
      if (is_subscribed) {
        return {
          decision: "NO",
          mesg: "No need to notify the user",
        };
      } else {
        var sql2 =
          "select bi.userId , bi.subscriptionRequestId, bw.created_at , bw.paymentStatus from bkash_webhook as bw  join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId where bi.userId = ? order by bw.created_at desc";
        const result2 = await DB.query(sql2, userId);
        const len = result2.length;
        let subscribedUser = 0;
        //console.log(result2[0])
        for (let i = 0; i < len; i++) {
          if (result2[i].paymentStatus == "FAILED_PAYMENT") {
            subscribedUser = 1;
            break;
          }
        }

        if (subscribedUser && result2[0].paymentStatus == "FAILED_PAYMENT") {
          return {
            decision: "YES",
            mesg: "Please recharge sufficient balance on your Bkash for successful payment",
          };
        } else {
          return {
            decision: "NO",
            mesg: "No need to notify the user",
          };
        }
      }

      return {
        decision: "NO",
        mesg: "No need to notify the user",
      };

      //console.log(result1[0].is_subscribed);
    } catch (e) {
      console.log(e);
      return undefined;
    }
  };

  bkashCreateSubscriptionRequest = async (bodyData, headersData) => {
        var data = {
      subscriptionRequestId: bodyData.SUBSCRIPTIONREQUESTID,
      serviceId: bodyData.SERVICEID,
      paymentType: bodyData.PAYMENTTYPE,
      subscriptionType: bodyData.SUBSCRIPTIONTYPE,
      amountQueryUrl: bodyData.AMOUNTQUERYURL,
      amount: bodyData.AMOUNT,
      firstPaymentAmount: bodyData.FIRSTPAYMENTAMOUNT,
      currency: bodyData.CURRENCY,
      firstPaymentIncludedInCycle: bodyData.FIRSTPAYMENTINCLUDEDINCYCLE,
      maxCapAmount: bodyData.MAXCAPAMOUNT,
      maxCapRequired: bodyData.MAXCAPREQUIRED,
      frequency: bodyData.FREQUENCY,
      startDate: bodyData.STARTDATE,
      expiryDate: bodyData.EXPIRYDATE,
      payerType: bodyData.PAYERTYPE,
      payer: bodyData.PAYER,
      subscriptionReference: bodyData.SUBSCRIPTIONREFERENCE,
      extraParams: bodyData.EXTRAPARAMS,
      redirectUrl: bodyData.REDIRECTURL,
      merchantShortCode: bodyData.MERCHANTSHORTCODE,
    };

    const headers = {
      version: headersData.version,
      channelId: headersData.channelid,
      timeStamp: headersData.timestamp,
      "x-api-key": headersData.xapikey,
      "Content-Type": headersData.contenttype,
    };

    const that = this;
    try {
      // console.log("dta IT: " + JSON.stringify(headersData))
      // console.log("dta BODY: " + JSON.stringify(bodyData))
      const url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {


          that.addResponseData(JSON.stringify(response.data));
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
            // return StatusCode.StatusCode.(res)
          }
        });



      // this.addResponseData(JSON.stringify(obj))
      return obj;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  makeSubscriptionId(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    var setResult = "Kabbik-" + result;
    return setResult;
  }

  bkashCreateSubscriptionRequestApp = async (req) => {

    try {
      var userId = req.body.USERID;
      var packageId = req.body.PACKAGEID;
      var subscripRequestFrom = req.body.subscripRequestFrom;
      var promoCode = req.body.promo_code;
            
      let firstPaymentAmount;

      var req_id = this.makeSubscriptionId(10);

      const findPackageSql = `SELECT * FROM subscription_packages WHERE subscriptionItemId = ${packageId}`;

      if (!userId || !packageId) {
        if(!(packageId && req.body.pubId)){
          return {
                  "success": false,
                  "message": "User or Subscription plan not found"
                };
        }
        
      }

            


         
      const packages = await DB.query(findPackageSql);
      firstPaymentAmount = packages[0].rawPrice;

      try {

        if (promoCode) {
          const promoSql = `
  (SELECT 
    'promo' AS type,
    reduce_price,
    NULL AS discount
  FROM promo
  WHERE promocode = ? AND for_package = ?
  LIMIT 1)

  UNION ALL

  (SELECT 
    'refer' AS type,
    NULL AS reduce_price,
    NULL AS discount
  FROM users
  WHERE refer_code = ?
  LIMIT 1)

  UNION ALL

  (SELECT 
    'affiliate' AS type,
    NULL AS reduce_price,
    discount
  FROM affiliate_user
  WHERE refer_code = ?
  LIMIT 1)
`;
          const promoRes = await DB.query(promoSql, [promoCode, packageId, promoCode, promoCode]);
          if (promoRes.length >= 1) {
            if (promoRes[0].type === "promo") {
              firstPaymentAmount = firstPaymentAmount - promoRes[0].reduce_price;
            }

            else if (promoRes[0].type === "refer") {
              firstPaymentAmount = firstPaymentAmount - (firstPaymentAmount * 0.2);
            }
            else if (promoRes[0].type === "affiliate") {
              firstPaymentAmount = firstPaymentAmount - (firstPaymentAmount * promoRes[0].discount);
            }
          }

        }

      } catch (e) {
        console.log("Promo code not found......", e);
      }
      

      if (packages[0]?.is_free_trail === 1) {
        const invoiceSql = `SELECT * from bkash_invoice WHERE subscribed = 1 AND is_free_trial = 1 AND userId = ${userId} AND package_id = ${packageId}`;
        const invoiceRes = await DB.query(invoiceSql);
        if (invoiceRes.length > 0) {
          packages[0].is_free_trail = 0;
        }
      }

      
      let today;
      let subscriptionType;

      if (packages[0].is_free_trail === 1) {
        today = addCalendarDaysInZone(
          DHAKA_TZ,
          packages[0].free_trial_in_day
        );
        subscriptionType = "BASIC";
      } else {
        today = calendarDateInZone(DHAKA_TZ);
        subscriptionType = "WITH_PAYMENT";
      }

      const expireDate =
        packages[0].is_free_trail === 1
          ? subscriptionExpiryDateInZone(
              DHAKA_TZ,
              new Date(),
              packages[0].free_trial_in_day
            )
          : subscriptionExpiryDateInZone(DHAKA_TZ);


      //BASIC
      var data = {
        subscriptionRequestId: req_id,
        serviceId: "100001",
        paymentType: "FIXED",
        subscriptionType: subscriptionType,
        amountQueryUrl: null,
        amount: packages[0].rawPrice,
        firstPaymentAmount: firstPaymentAmount,
        currency: "BDT",
        firstPaymentIncludedInCycle: true,
        maxCapAmount: null,
        maxCapRequired: false,
        frequency: packages[0].frequency,
        startDate: today,
        expiryDate: expireDate,
        payerType: "CUSTOMER",
        payer: null,
        subscriptionReference: "MSMSR781D",
        extraParams: null,
        redirectUrl: URL_BKASH_REDIRECT,
        merchantShortCode: "01978519690",
      };

      if (subscripRequestFrom == "bkashApp") {
        data.redirectUrl = URL_BKASH_REDIRECT_BKASHAPP;
      }

      

      const headers = {
        version: "v1.2",
        channelId: "Merchant WEB",
        timeStamp: "2021-08-24T12:04:31.353163Z",
        "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
        "Content-Type": "application/json",
      };

      try {

        const url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscription";
        var config = {
          method: "POST",
          headers: headers,
          data: data,
          url,
        };
        const obj = await axios(config)
          .then(function (response) {
            return response.data;
          })
          .catch(function (error) {
                        if (error.response) {
              return  StatusCheck.checkStatus(error.response.data.errorCode);
            }
          });


        //invoice insert part

        var querySource = req.query.source || "";
        var platform = req.query.platform || "";
        var channel = req.body.channel || "global";

        const tracker = obj.redirectURL.substring(
          obj.redirectURL.lastIndexOf("/") + 1
        );

      if(req.body.clickId && req.body.pubId){
         PaymenLogUtils.insertCpaMarketingRecord(userId, packageId, req.body.clickId, req.body.pubId, "Bkash", firstPaymentAmount,obj.subscriptionRequestId);
      }

        const sql = `INSERT INTO bkash_invoice (userId, redirectURL, subscriptionRequestId, bkash_subscription_type, is_free_trial, request_payload, split_part, expirationTime, timeStamp,package_id, promoCode, channel, source, platform, amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
        await DB.query(sql, [
          userId,
          obj.redirectURL,
          obj.subscriptionRequestId,
          subscriptionType,
          packages[0].is_free_trail,
          JSON.stringify(data),
          tracker,
          obj.expirationTime,
          obj.timeStamp,
          packageId,
          promoCode,
          channel,
          querySource,
          platform,
          firstPaymentAmount,
        ]);


        return obj;

      } catch (error) {
        return {
          "success": false,
          "message": `Request Failed: ${error.message || error}`
        }

      }
    } catch (error) {
      return {
        "success": false,
        "message": `Request Failed: ${error.message || error}`
      }
    }

  };



   bkashCreateMicrositeRecurringSubscription = async (req) => {
    const bodyData = req.body;
    var userId = bodyData.USERID;
    let package_id = bodyData.PACKAGEID;
    let promo = bodyData.promo;

    var cycleFrequency;

    var req_id = this.makeSubscriptionId(10);

    var mainAmount = bodyData.AMOUNT;
    if (bodyData.PACKAGEID == 1) {
      cycleFrequency = "THIRTY_DAYS";
      mainAmount = 50;
    } else if (bodyData.PACKAGEID == 2) {
      cycleFrequency = "ONE_EIGHTY_DAYS";
      mainAmount = 250;
    } else if (bodyData.PACKAGEID == 3) {
      cycleFrequency = "CALENDAR_YEAR";
      mainAmount = 450;
    } else if (bodyData.PACKAGEID == 5) {
      cycleFrequency = "CALENDAR_YEAR";
      mainAmount = 450;
    } else if (bodyData.PACKAGEID == 4) {
      cycleFrequency = "DAILY";
      mainAmount = 4;
    } else {
      return null;
    }

    const today = calendarDateInZone(DHAKA_TZ);
    const expireDate = subscriptionExpiryDateInZone(DHAKA_TZ);
    var data = {
      amount: mainAmount,
      amountQueryUrl: null,
      firstPaymentAmount: bodyData.FIRSTPAYMENTAMOUNT || mainAmount,
      firstPaymentIncludedInCycle: true,
      serviceId: 100001,
      currency: "BDT",
      startDate: today,
      expiryDate: expireDate,
      frequency: cycleFrequency,
      subscriptionType: "WITH_PAYMENT",
      maxCapAmount: null,
      maxCapRequired: false,
      payer: null,
      payerType: "CUSTOMER",
      paymentType: "FIXED",
      redirectUrl: URL_BKASH_REDIRECT_MC,
      subscriptionRequestId: req_id, // Must be Unique.
      subscriptionReference: "MSMSR2",
      extraParams: null,
    };


    var headers = {
      "version": "v1.0",
      "channelId": "Merchant WEB",
      "timeStamp": "2021-08-24T12:04:31.353163Z",
      "Content-Type": "application/json",
    };

    let url;
    let referer = req.headers.referer || req.headers.referrer || "";
    let environment = "PRODUCTION";

    if (referer.includes("bkash-staging.kabbik.com")) {
      data.merchantShortCode = "01789123455";
      headers["x-api-key"] = "o42HqdbJtEoqyZA8uGn-ElEuee4_IAPQ";
      url = "https://gateway.sbrecurring.pay.bka.sh/gateway/api/subscription";
      environment = "DEVELOPMENT";
    } else {
      data.merchantShortCode = "01915225026";
      headers["x-api-key"] = "cLc3Pfm53pWuSIxsbbnUjaped5qNOJr9";
      url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscription";
    }


    try {

      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      let responseData;

      const obj = await axios(config)
        .then(function (response) {
          responseData = response;
          return response.data;
        })
        .catch(function (error) {
           if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      if (responseData?.data?.redirectURL) {
        let splitArr = responseData?.data?.redirectURL.split("/");
        let split_part = splitArr[splitArr.length - 1];
        const insertSql = `INSERT INTO bkash_mc_invoice(userId,
          package_id,  
          subscriptionRequestId,  
          split_part,  
          expirationTime,  
          timeStamp,  
          promo_code,  
          subscribed,  
          request_payload,
          first_payment_amount,
          amount, environment, referer ) VALUES (?,?, ?,?,?,?,?,?,?,?,?, ?, ?);`;

        await DB.query(insertSql, [
          userId,
          package_id,
          req_id,
          split_part,
          expireDate,
          today,
          promo,
          0,
          JSON.stringify(data),
          bodyData.FIRSTPAYMENTAMOUNT,
          mainAmount,
          environment,
          referer
        ]);
      }

      return obj;
    } catch (error) {
      console.log("error", error.message);
      return null;
    }
  };




  microSiteRedirectURL = async (reference) => {
    var returnValue = {
      success: false,
      fromSource: "kabbik",
      platform: "app",
      environment: "PRODUCTION"
    };
    try {
      const insertSql = "SELECT * FROM bkash_mc_invoice WHERE split_part = ?;";
      const result = await DB.query(insertSql, [reference]);
      if (result) {


        let subscription_request_id = result[0].subscriptionRequestId;

        var headers = {
          version: "v1.0",
          channelId: "Merchant WEB",
          timeStamp: "2021-08-24T12:04:31.353163Z",
          "x-api-key": "cLc3Pfm53pWuSIxsbbnUjaped5qNOJr9",
          "Content-Type": "application/json",
        };

        var url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/request-id/" + subscription_request_id;
       
        if(result[0].environment === "DEVELOPMENT" ){
         url = "https://gateway.sbrecurring.pay.bka.sh/gateway/api/subscriptions/request-id/" + subscription_request_id;
         headers["x-api-key"] = "o42HqdbJtEoqyZA8uGn-ElEuee4_IAPQ";
         returnValue.environment = "DEVELOPMENT";
        }



        var config = {
          method: "get",
          url: url,
          headers: headers,
        };


        const response = await axios(config);
 
        const obj = response.data;

       config.url = `https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/bySubscriptionId/${obj.id}`;

        if(result[0].environment === "DEVELOPMENT"){
        config.url = `https://gateway.sbrecurring.pay.bka.sh/gateway/api/subscription/payment/bySubscriptionId/${obj.id}`;
        }

        const subscriptionDetails = await axios(config);
        await DB.query(
          `UPDATE bkash_mc_invoice 
           SET call_back_data = ? 
           WHERE split_part = ?`,
          [JSON.stringify(subscriptionDetails.data[0]), reference]
        );

        if (subscriptionDetails.data?.[0]?.status === "SUCCEEDED_PAYMENT") {
          returnValue.success = true;
        }
        else {
          returnValue.message = subscriptionDetails.data?.[0]?.status || "Payment Status Failed";
          returnValue.success = false;
        }
        return returnValue;
      }
    } catch (e) {
      console.log(e);
      returnValue.message = e.message || "Catch block executed";
      return returnValue;
    }
  };

  getMcBkashPaymentListSubscriptionID = async (
    subscription_id
  ) => {
    const headers = {
      version: "v1.0",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "cLc3Pfm53pWuSIxsbbnUjaped5qNOJr9",
      "Content-Type": "application/json",
    };

    const that = this;
    try {
      var url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/bySubscriptionId/" + subscription_id;

      var config = {
        method: "get",
        url: url,
        headers: headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log(error);
      console.log("Failed");
      return null;
    }
  };


  getBkashRefundPayment_mc = async (paymentId, amount) => {
    var data = {
      paymentId: paymentId,
      amount: amount,
    };

    const headers = {
      version: "v1.0",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "cLc3Pfm53pWuSIxsbbnUjaped5qNOJr9",
      "Content-Type": "application/json",
    };

    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/refund";
      var config = {
        method: "post",
        url: url,
        headers: headers,
        data: data,
      };

      const obj = await axios(config)
        .then(function (response) {

          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };




  paymentBkashNotificationMicroSite = async (headerData, bodyData) => {


    var headerStr = JSON.stringify(headerData);
    var bodyStr = JSON.stringify(bodyData);
    // const sqlUser = `SELECT * from users WHERE subscription_id = ? AND payment_method = ?`;
    const userIdFromInvoice = `
      SELECT userId, package_id, payer, promo_code FROM bkash_mc_invoice
      WHERE subscriptionRequestId = ?
    `;

    var nextPaymentDate = bodyData.nextPaymentDate;
    var nextPaymentDateTime = Date.parse(nextPaymentDate);
    var currentDateTime = new Date().getTime();

    try {
      var sql;
      const signature = headerData["x-signature"];
      if (signature) {
        const userIdFromInvoiceResult = await DB.query(userIdFromInvoice, [
          bodyData.subscriptionRequestId,
        ]);
        sql = `INSERT INTO bkash_mc_webhook(subscriptionRequestId,paymentId,paymentStatus,subscriptionId,trxId,amount,dueDate,nextPaymentDate,trxDate,firstPayment,signature,header_response,body_response,type,reverseTrxId,reversTrxDate,subscriptionStatus,cancelledBy)
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        let result = DB.query(sql, [
          bodyData.subscriptionRequestId,
          bodyData.paymentId,
          bodyData.paymentStatus,
          bodyData.subscriptionId,
          bodyData.trxId,
          bodyData.amount || bodyData.refundedAmount,
          bodyData.dueDate,
          bodyData.nextPaymentDate,
          bodyData.trxDate,
          bodyData.firstPayment,
          headerData["x-signature"],
          headerStr,
          bodyStr,
          headerData.type,
          bodyData.reverseTrxId,
          bodyData.reversTrxDate,
          bodyData.subscriptionStatus,
          bodyData.cancelledBy,
        ]);

        if (bodyData.paymentStatus == "SUCCEEDED_PAYMENT") {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, package_id = ?, payment_method = ?, subscription_id = ?,  purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
          const sqlUp = `UPDATE bkash_mc_invoice SET subscribed = ?, subscriptionId = ? WHERE subscriptionRequestId = ?`;
          await Promise.all([
            DB.query(sqlUpdateUser, [
              true,
              userIdFromInvoiceResult[0].package_id,
              "bKash",
              bodyData.subscriptionRequestId,
              currentDateTime,
              nextPaymentDateTime,
              0,
              Number(userIdFromInvoiceResult[0].userId),
            ]),
            DB.query(sqlUp, ["1", bodyData.subscriptionId, bodyData.subscriptionRequestId]),
          ]);

          try {
            const findUsersSql = `SELECT * from users where id = ?`;
            const findUsers = await DB.query(findUsersSql, [
              userIdFromInvoiceResult[0].userId,
            ]);

            PaymenLogUtils.insertUserPaymentLog(
              userIdFromInvoiceResult[0].userId,
              findUsers[0].user_name,
              findUsers[0].full_name,
              userIdFromInvoiceResult[0].package_id,
              "Bkash",
              "Subscription",
              bodyData.firstPayment,
              1,
              "SUCCEEDED_PAYMENT",
              1,
              userIdFromInvoiceResult[0].payer,
              bodyData.subscriptionRequestId,
              bodyData.amount,
              userIdFromInvoiceResult[0].promo_code,
              0,
              bodyData.nextPaymentDate,
              "Kabbik",
              "Bkash-Microsite"
            );
          } catch (e) {
            console.log("Errrrrrrrrrrrrrror", e);
          }
        } else if (bodyData.subscriptionStatus == "CANCELLED") {
          var resultUser;
          const sqlUser = `
            SELECT us.*, bi.package_id, bi.payer, bi.subscriptionRequestId
            FROM 
              (SELECT * FROM users WHERE payment_method = 'bKash') AS us
            LEFT JOIN 
              (SELECT * FROM bkash_mc_invoice WHERE subscriptionRequestId = ?) AS bi
            ON bi.userId = us.id
            WHERE us.subscription_id = ?;
          `;
          resultUser = await DB.query(sqlUser, [
            bodyData.subscriptionRequestId,
            bodyData.subscriptionRequestId,
          ]);

          const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE id = ?`;
          await DB.query(sqlUpdateUser, [
            1,
            resultUser[0].id,
          ]);


          PaymenLogUtils.insertUserPaymentLog(
            resultUser[0].id,
            resultUser[0].user_name,
            resultUser[0].full_name,
            resultUser[0].package_id,
            "Bkash",
            "Subscription",
            0,
            1,
            "UNSUBSCRIBED",
            0,
            resultUser[0].payer,
            resultUser[0].subscriptionRequestId,
            0,
            null,
            1,
            null,
            "Kabbik",
            "Bkash-Microsite"
          );

        }

        if (result) {
          return result;
        }
      }
    } catch (e) {
      const insertToWebhookErrorLog = `INSERT INTO bkash_webhook_error_log(subscriptionRequestId, error_details, header, body) VALUES(?, ?, ?, ?)`;
      await DB.query(insertToWebhookErrorLog, [
        bodyData.subscriptionRequestId,
        JSON.stringify(e),
        headerStr,
        bodyStr,
      ]);
      return undefined;
    }
  };




  bkashCreateSubscriptionRequestAppBkashMicrosite = async (
    bodyData,
    headersData
  ) => {
    var userId = bodyData.USERID;
    var company_name = bodyData.company_name;
    var click_id = bodyData.click_id;
    var subscripRequestFrom = bodyData.subscripRequestFrom;

    var req_id = this.makeSubscriptionId(10);
    var mainAmount = bodyData.AMOUNT;
    if (bodyData.PACKAGEID == 1) {
      mainAmount = 50;
    }
    if (bodyData.PACKAGEID == 2) {
      mainAmount = 250;
    }
    if (bodyData.PACKAGEID == 3) {
      mainAmount = 450;
    }
    var data = {
      subscriptionRequestId: req_id,
      serviceId: "100001",
      paymentType: "FIXED",
      subscriptionType: "WITH_PAYMENT",
      amountQueryUrl: null,
      amount: mainAmount,
      firstPaymentAmount: bodyData.FIRSTPAYMENTAMOUNT,
      currency: bodyData.CURRENCY,
      firstPaymentIncludedInCycle: true,
      maxCapAmount: null,
      maxCapRequired: false,
      frequency: bodyData.FREQUENCY,
      startDate: bodyData.STARTDATE,
      expiryDate: bodyData.EXPIRYDATE,
      payerType: "CUSTOMER",
      payer: null,
      subscriptionReference: "MSMSR781D",
      extraParams: null,
      redirectUrl:
        URL_BKASH_REDIRECT_BKASH_MICROSITE,
      merchantShortCode: "01978519690",
    };

    if (subscripRequestFrom == "bkashApp") {
      data.redirectUrl =
        URL_BKASH_REDIRECT_BKASHAPP;
    }

    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    const that = this;
    try {
      const url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      if (click_id && company_name) {
        const insertSql =
          "INSERT INTO promotion_track_table(company_name, track_id, bkash_request_id, user_id) VALUES (?,?, ?,?);";
        try {
          const resultsInsertSql = await DB.query(insertSql, [
            company_name,
            click_id,
            req_id,
            userId,
          ]);
        } catch (error) {
          console.log(error);
        }
      }
      return obj;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  

  bkashOnetimeCreatePayment = async (req, res) => {
    var { userId, amount, packageId, promo_code, source, description } =
      req.body;
    var { source: trafficSource = "N/A", platform = "N/A" } = req.query;

    try {
      if (!userId) {
        throw new HttpException(400, "Undefined UserID");
      }
      if (!promo_code) {
        promo_code = "N/A";
      }
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {

          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });


      var dataCreatePayment = {
        mode: "0011",
        callbackURL: URL_REDIRECT_BKASH_ONETIME,
        payerReference: "INV-1655455339807",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "1655455339809",
      };

      const headersCreatePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      // const that = this

      const urlCreatePayment = URL_CREATE_PAYMENT_BKASH_ONETIME;
      var configCreatePayment = {
        method: "post",
        url: urlCreatePayment,
        headers: headersCreatePayment,
        data: dataCreatePayment,
      };
      const createPaymentRes = await axios(configCreatePayment);

      const objCreatePayment = createPaymentRes.data;

        if(req.body.clickId && req.body.pubId){
       PaymenLogUtils.insertCpaMarketingRecord(userId, packageId, req.body.clickId, req.body.pubId, "Bkash", objCreatePayment.amount);
      }

      const insertCreatePayment = `INSERT INTO bkash_onetime(
                id_token, 
                token_type, 
                expires_in, 
                refresh_token,
                statusCode,
                statusMessage,
                paymentID,
                bkashURL,
                callbackURL,
                successCallbackURL,
                failureCallbackURL,
                cancelledCallbackURL,
                amount,
                userId,
                packageId,
                source,
                intent,
                currency,
                paymentCreateTime,
                transactionStatus,
                merchantInvoiceNumber,
                promo_code,
                trafficSource,
                platform

                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;

       try {
        const resultsInsertCreatePayment = await DB.query(insertCreatePayment, [
          objGrantToken.id_token,
          objGrantToken.token_type,
          objGrantToken.expires_in,
          objGrantToken.refresh_token,
          createPaymentRes.status,
          objCreatePayment.statusMessage,
          objCreatePayment.paymentId,
          objCreatePayment.bkashURL,
          objCreatePayment.callbackURL,
          objCreatePayment.successCallbackURL,
          objCreatePayment.failureCallbackURL,
          objCreatePayment.cancelledCallbackURL,
          objCreatePayment.amount,
          userId,
          packageId,
          source,
          objCreatePayment.intent,
          objCreatePayment.currency,
          objCreatePayment.paymentCreateTime,
          objCreatePayment.transactionStatus,
          objCreatePayment.merchantInvoiceNumber,
          promo_code,
          trafficSource,
          platform,
        ]);
        if (resultsInsertCreatePayment) {
        }
      } catch (error) {
        console.log(error);
      }
      // console.log("M: " + JSON.stringify(objCreatePayment));

      // console.log("objCreatePayment");
      // console.log(objCreatePayment);
      // console.log("objCreatePayment");
      return objCreatePayment;
      // objCreatePayment.userId = userId
      // // objCreatePayment.admissionQuestionId = admissionQuestionId ? admissionQuestionId : ""
      // // objCreatePayment.boardQuestionId = boardQuestionId ? boardQuestionId : ""
      // // await this.repository.addEntityBkashOnetime(objCreatePayment)
      // // this.addResponseData(JSON.stringify(obj))
      // return objCreatePayment;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  bkashOnetimeCreatePaymentBkashMicrosite = async (req, res) => {
    var { userId, amount, packageId, promo_code, source, description } =
      req.body;
    var { source: trafficSource = "", platform = "" } = req.query;

    try {
      if (!userId) {
        throw new HttpException(400, "Undefined UserID");
      }
      if (!promo_code) {
        promo_code = "N/A";
      }
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      var dataCreatePayment = {
        mode: "0011",
        callbackURL:
          URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE,
        payerReference: "INV-1655455339807",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "1655455339809",
      };

      const headersCreatePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };
      const urlCreatePayment = URL_CREATE_PAYMENT_BKASH_ONETIME;
      var configCreatePayment = {
        method: "post",
        url: urlCreatePayment,
        headers: headersCreatePayment,
        data: dataCreatePayment,
      };
      const objCreatePayment = await axios(configCreatePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      const insertCreatePayment = `INSERT INTO bkash_onetime(
        id_token, 
        token_type, 
        expires_in, 
        refresh_token,
        statusCode,
        statusMessage,
        paymentID,
        bkashURL,
        callbackURL,
        successCallbackURL,
        failureCallbackURL,
        cancelledCallbackURL,
        amount,
        userId,
        packageId,
        source,
        intent,
        currency,
        paymentCreateTime,
        transactionStatus,
        merchantInvoiceNumber,
        promo_code,
        trafficSource,
        platform
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
      try {
        const resultsInsertCreatePayment = await DB.query(insertCreatePayment, [
          objGrantToken.id_token,
          objGrantToken.token_type,
          objGrantToken.expires_in,
          objGrantToken.refresh_token,
          objCreatePayment.statusCode,
          objCreatePayment.statusMessage,
          objCreatePayment.paymentID,
          objCreatePayment.bkashURL,
          objCreatePayment.callbackURL,
          objCreatePayment.successCallbackURL,
          objCreatePayment.failureCallbackURL,
          objCreatePayment.cancelledCallbackURL,
          amount,
          userId,
          packageId,
          source,
          objCreatePayment.intent,
          objCreatePayment.currency,
          objCreatePayment.paymentCreateTime,
          objCreatePayment.transactionStatus,
          objCreatePayment.merchantInvoiceNumber,
          promo_code,
          trafficSource,
          platform,
        ]);
      } catch (error) {
        console.log(error);
      }
      return objCreatePayment;
    } catch (error) {
      console.log(error);
      return null;
    }
  };


  bkashOnetimeCreatePaymentAudioBookPurchase = async (req, res) => {
    var {
      userId,
      name,
      email,
      phone,
      address,
      amount,
      audioBookId,
      promo_code,
      source,
      platform,
      productId,
      type
    } = req.body;

    try {
      if (!userId) {
        throw new HttpException(400, "Undefined UserID");
      }
      if (!promo_code) {
        promo_code = "N/A";
      }

      const checkExistsQuery = `SELECT Count(*) as is_exist FROM audiobooks_rent  WHERE user_id = ? AND audiobook_id = ? AND expired_at > NOW()  AND is_purchased = 1`;
      const checkCategoryAlreadyPurchased = `SELECT Count(*) as is_exist FROM purchased_category  WHERE user_id = ? AND category_id = ? AND expired_at > NOW()  AND is_purchased = 1`;

      let audioBookIsExsists;

      try {
        if (type == "category") {
          audioBookIsExsists = await DB.query(checkCategoryAlreadyPurchased, [
            userId,
            productId,
          ]);
        }
        else {
          audioBookIsExsists = await DB.query(checkExistsQuery, [
            userId,
            audioBookId,
          ]);
        }
        if (audioBookIsExsists[0].is_exist > 0) {
          return {
            status: false,
            message: "Audiobook already purchased and date not expired",
          };
        }
      } catch (error) {
        console.log("errorerror", error)
        return {
          status: "false",
          message: "some thing went wrong",
        };
      }

      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });



      var dataCreatePayment = {
        mode: "0011",
        callbackURL: URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase,
        payerReference: "INV-1655455339807",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "1655455339809",
      };

      const headersCreatePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      const urlCreatePayment = URL_CREATE_PAYMENT_BKASH_ONETIME;
      var configCreatePayment = {
        method: "post",
        url: urlCreatePayment,
        headers: headersCreatePayment,
        data: dataCreatePayment,
      };
      const objCreatePayment = await axios(configCreatePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });


      const paymentMethod = "bkash";

      const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, email, phone, address, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method, purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;


      await DB.query(storeLogInsertQuery, [
        userId,
        name,
        email,
        phone,
        address,
        objCreatePayment.paymentId,
        objCreatePayment.trxID,
        objCreatePayment.transactionStatus,
        objCreatePayment.statusMessage,
        amount,
        promo_code,
        source,
        platform,
        paymentMethod,
        type || "Audiobook",
        productId || audioBookId,
      ]);

      //new added
      objCreatePayment.callBackUrl = objCreatePayment.bkashURL;
      objCreatePayment.callbackURL = objCreatePayment.bkashURL;

      return objCreatePayment;
    } catch (error) {
      console.log(error);
      return null;
    }
  };


  bkashOnetimeCreatePaymentCoursePurchase = async (req, res) => {
    var {
      userId,
      name,
      email,
      phone,
      address,
      amount,
      courseId,
      productId,
      promo_code,
      source,
      platform,
      store_item,
      type,
    } = req.body;
    if (!productId) {
      productId = courseId;
    }

    if (!type) {
      type = "Course";
    }

    try {
      if (!userId) {
        throw new HttpException(400, "Undefined UserID");
      }
      if (!promo_code) {
        promo_code = "N/A";
      }

      const checkExistsQuery = `SELECT Count(*) as is_exist FROM course_purchase_table  WHERE user_id = ? AND course_id = ?`;
      let courseIsExsists;

      courseIsExsists = await DB.query(checkExistsQuery, [userId, productId]);
      let data;
      if (courseIsExsists[0].is_exist > 0) {
        return {
          status: false,
          message: "Course already purchased",
        };
      }

      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
 
      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {

          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });


      var dataCreatePayment = {
        mode: "0011",
        callbackURL: URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE,
        payerReference: "INV-1655455339807",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "1655455339809",
      };

      const headersCreatePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      // const that = this

      const urlCreatePayment = URL_CREATE_PAYMENT_BKASH_ONETIME;
      var configCreatePayment = {
        method: "post",
        url: urlCreatePayment,
        headers: headersCreatePayment,
        data: dataCreatePayment,
      };
      const objCreatePayment = await axios(configCreatePayment)
        .then(function (response) {
          // console.log("dta IT: " + response.data)

          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });


      const paymentMethod = "bkash";
      const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, email, phone, address, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method, store_item, purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      await DB.query(storeLogInsertQuery, [
        userId,
        name,
        email,
        phone,
        address,
        objCreatePayment.paymentId,
        objCreatePayment.trxID,
        objCreatePayment.transactionStatus,
        objCreatePayment.statusMessage,
        amount,
        promo_code,
        source,
        platform,
        paymentMethod,
        JSON.stringify(store_item),
        type,
        productId,
      ]);

      objCreatePayment.callbackURL = objCreatePayment.bkashURL;

      return objCreatePayment;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  bkashOnetimeCreatePaymentVoiceAcademy = async (req, res) => {
    var {
      userId,
      enrollmentId,
      amount,
      promo_code,
      source,
      platform,
      store_item,
      type,
    } = req.body;
    console.log("req.body: ", req.body);
    if (!type) {
      type = "VoiceAcademy";
    }
  
    try {
      if (!userId) {
        throw new HttpException(400, "Undefined UserID");
      }
      if (!enrollmentId && !store_item) {
        throw new HttpException(400, "Undefined EnrollmentID");
      }
      if (!promo_code) {
        promo_code = "N/A";
      }      
  
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };
  
      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
  
      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
  
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
  
      var dataCreatePayment = {
        mode: "0011",
        callbackURL: URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE,
        payerReference: "INV-1655455339807",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "1655455339809",
      };
  
      const headersCreatePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };
  
      const urlCreatePayment = URL_CREATE_PAYMENT_BKASH_ONETIME;
      var configCreatePayment = {
        method: "post",
        url: urlCreatePayment,
        headers: headersCreatePayment,
        data: dataCreatePayment,
      };
  
      const objCreatePayment = await axios(configCreatePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
  
      const paymentMethod = "bkash";
      const persistedStoreItem =
        String(type).toLowerCase() === "ebook"
          ? String(store_item)
          : JSON.stringify(store_item);
  
      const insertQuery = `
        INSERT INTO bkashVoiceAcademy 
          (user_id, status_message, transaction_id, transaction_status, payment_id, store_item, source, platform, amount, promo_code, payment_method, purchase_type, enrollment_id, is_succeed, delivery_status) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;
  
      await DB.query(insertQuery, [
        userId,
        objCreatePayment.statusMessage,
        objCreatePayment.trxID,
        objCreatePayment.transactionStatus,
        objCreatePayment.paymentId,
        persistedStoreItem,
        source,
        platform,
        amount,
        promo_code,
        paymentMethod,
        type,
        enrollmentId || persistedStoreItem,
        0, // is_succeed - set to 1 later in your callback/execute-payment step
        "ordered", // delivery_status - default matches table definition
      ]);
  
      objCreatePayment.callbackURL = objCreatePayment.bkashURL;
  
      return objCreatePayment;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  // giveAccessToQuiz=async(result)=>{
  //   console.log("1heeeeeeeeeeeeeeeeeeeeeeeeeee",result)

  //   if (result[0].promo_code === "QUIZ26WORLDCUP" || result[0].promo_code === "QUIZ26WORLDCUPNEXT") {
  //     let isToday=result[0].promo_code === "QUIZ26WORLDCUP";
  //     const today = new Date();
  //     const nextDay = new Date(today);
  //     nextDay.setDate(today.getDate() + 1);
  //     console.log("heeeeeeeeeeeeeeeeeeeeeeeeeee0")


  //     const formatDate = (date) => {
  //       const year = date.getFullYear();
  //       const month = String(date.getMonth() + 1).padStart(2, "0");
  //       const day = String(date.getDate()).padStart(2, "0");

  //       return `${year}-${month}-${day}`;
  //     };
  //     const quizSql = `
  //       INSERT INTO quiz_access (user_id, access_date, created_at, updated_at)
  //       VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
  //     `;
  //     console.log("heeeeeeeeeeeeeeeeeeeeeeeeeee")
  //    DB.query(quizSql, [result[0].userId, formatDate(isToday?today:nextDay)])
  // }
  // }


  bkashOnetimeCallback = async (queryData) => {
    try {
      var returnValue = {
        success: true,
        fromSource: "kabbik",
        platform: "app",
      };
      if (!queryData.paymentID) {
        returnValue.success = false;
        return returnValue;
      }

      const sqlUser = `SELECT * from bkash_onetime WHERE paymentID = ?`;
      
      
      var resultUser = await DB.query(sqlUser, [queryData.paymentID]);
      var oneTimeData = resultUser[0];
      

      var dataExecutePayment = {
        paymentId: queryData.paymentID,
      };

      const headersExecutePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: oneTimeData.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      
      const urlExecutePayment = URL_EXECUTE_PAYMENT_BKASH_ONETIME;
      var configExecutePayment = {
        method: "post",
        url: urlExecutePayment,
        headers: headersExecutePayment,
        data: dataExecutePayment,
      };
      const createdPaymentRes = await axios(configExecutePayment).catch(function (error) {
          return error.response;
        });

        const objExecutePayment = createdPaymentRes.data;
        
      if (objExecutePayment?.transactionStatus === "Completed") {
      // if(true){
        
        var someDate = new Date();
        var numberOfDaysToAdd = 6;
        if (oneTimeData.packageId != null && oneTimeData.packageId == 1) {
          numberOfDaysToAdd = 30;
        }
        if (oneTimeData.packageId != null && oneTimeData.packageId == 2) {
          numberOfDaysToAdd = 180;
        }
        if (oneTimeData.packageId != null && oneTimeData.packageId == 3) {
          numberOfDaysToAdd = 365;
        }
        var result444 = someDate.setDate(
          someDate.getDate() + numberOfDaysToAdd
        );
        var currentDateTime = new Date().valueOf();
        var nextPaymentDateTime = result444;
        var method = "BKASHONETIME";
        // console.log(nextPaymentDateTime)
        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
                const sqlUpdateBkashOnetime = `UPDATE bkash_onetime SET 
                executeStatusCode = ?, 
                executeStatusMessage = ?,
                payerReference = ?,
                subscribed = ?
                WHERE paymentID = ?`;

        await Promise.all([
          DB.query(sqlUpdateUser, [
            true,
            oneTimeData.paymentID,
            method,
            oneTimeData.packageId,
            currentDateTime,
            nextPaymentDateTime,
            0,
            oneTimeData.userId,
          ]),

          DB.query(sqlUpdateBkashOnetime, [
            createdPaymentRes.status,
            "Successful",
            objExecutePayment.payerAccount,
            1,
            oneTimeData.paymentID,
          ])

        ]);
                

        try {
          const findUsersSql = `SELECT * from users where id = ?`;
          const findUsers = await DB.query(findUsersSql, [
            oneTimeData.userId
          ]);

           PaymenLogUtils.insertUserPaymentLog(
            oneTimeData.userId,
            findUsers[0].user_name,
            findUsers[0].full_name,
            oneTimeData.packageId,
            "Bkash",
            "Subscription",
            1,
            0,
            "SUCCEEDED_PAYMENT",
            1,
            null,
            oneTimeData.paymentID,
            oneTimeData.amount,
            oneTimeData.promo_code,
            0,
            null,
            null,
            null,
            null
          );
          
        } catch (e) {
          console.log("Errrrrrrrrrrrrrror", e)
        }

        // try {
        //   if (
        //     oneTimeData.trafficSource == "Banglalink" &&
        //     oneTimeData.platform == "app"
        //   ) {
        //     returnValue.fromSource = "Banglalink";
        //     const sqlSelectUser = `SELECT phone_no FROM users WHERE id = ?`;
        //     const resultSelectUser = await DB.query(sqlSelectUser, [
        //       oneTimeData.userId,
        //     ]);
        //     MyblModel.sendWebhook({
        //       userId: oneTimeData.userId || "",
        //       payment_method: "bkash_onetime",
        //       msisdn:
        //         (resultSelectUser[0] && resultSelectUser[0].phone_no) || "",
        //       amount: oneTimeData.amount || "",
        //       transaction_id: oneTimeData.paymentID || "",
        //       transaction_time: Date.now(),
        //       status: objExecutePayment.statusMessage || "",
        //       remarks: "",
        //       reason: oneTimeData.packageId || "",
        //       others_data: "",
        //     });
        //   }
        // } catch (error) {
        //   console.error(error);
        //   // Handle the error
        // }
                await this.giveAccessToQuiz(resultUser)
        
        returnValue.success = true;
        return returnValue;
      }

      if (
        oneTimeData.trafficSource == "Banglalink" &&
        oneTimeData.platform == "app"
      ) {
        returnValue.fromSource = "Banglalink";
      }

      const sqlUpdateBkashOnetime = `UPDATE bkash_onetime SET 
            executeStatusCode = ?, 
            executeStatusMessage = ?
            WHERE paymentID = ?`;

      
      await DB.query(sqlUpdateBkashOnetime, [
        createdPaymentRes.status,
        objExecutePayment.transactionStatus || objExecutePayment.errorMessageEn,
        oneTimeData.paymentID,
      ]);


      returnValue.success = false;
      return returnValue;
    } catch (error) {
      console.log("error")
      returnValue.success = false;
      return returnValue;
    }
  };



  bkashOnetimeCallbackBkashMicrosite = async (queryData) => {
    try {
      var returnValue = {
        success: true,
        fromSource: "bkash",
        platform: "app",
      };
      if (!queryData.paymentID) {
        returnValue.success = false;
        return returnValue;
      }

      const sqlUser = `SELECT * from bkash_onetime WHERE paymentID = ?`;

      var resultUser = await DB.query(sqlUser, [queryData.paymentID]);
      var oneTimeData = resultUser[0];
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      var dataExecutePayment = {
        paymentID: queryData.paymentID,
      };

      const headersExecutePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };
      const urlExecutePayment = URL_EXECUTE_PAYMENT_BKASH_ONETIME;
      var configExecutePayment = {
        method: "post",
        url: urlExecutePayment,
        headers: headersExecutePayment,
        data: dataExecutePayment,
      };
      const objExecutePayment = await axios(configExecutePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      if (objExecutePayment.statusCode == "0000") {
        var someDate = new Date();
        var numberOfDaysToAdd = 6;
        if (oneTimeData.packageId != null && oneTimeData.packageId == 1) {
          numberOfDaysToAdd = 30;
        }
        if (oneTimeData.packageId != null && oneTimeData.packageId == 2) {
          numberOfDaysToAdd = 180;
        }
        if (oneTimeData.packageId != null && oneTimeData.packageId == 3) {
          numberOfDaysToAdd = 365;
        }
        var result444 = someDate.setDate(
          someDate.getDate() + numberOfDaysToAdd
        );
        var currentDateTime = new Date().valueOf();
        var nextPaymentDateTime = result444;
        var method = "BKASHONETIME";
        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
        const resultUpdateUser = await DB.query(sqlUpdateUser, [
          true,
          oneTimeData.paymentID,
          method,
          oneTimeData.packageId,
          currentDateTime,
          nextPaymentDateTime,
          0,
          oneTimeData.userId,
        ]);
        const sqlUpdateBkashOnetime = `
          UPDATE bkash_onetime SET 
          executeStatusCode = ?, 
          executeStatusMessage = ?,
          subscribed = ?
          WHERE paymentID = ?
        `;
        const resultUpdateBkashOnetime = await DB.query(sqlUpdateBkashOnetime, [
          objExecutePayment.statusCode,
          objExecutePayment.statusMessage,
          1,
          oneTimeData.paymentID,
        ]);

        try {
          if (
            oneTimeData.trafficSource == "Banglalink" &&
            oneTimeData.platform == "app"
          ) {
            returnValue.fromSource = "Banglalink";
            const sqlSelectUser = `SELECT phone_no FROM users WHERE id = ?`;
            const resultSelectUser = await DB.query(sqlSelectUser, [
              oneTimeData.userId,
            ]);
            MyblModel.sendWebhook({
              userId: oneTimeData.userId || "",
              payment_method: "bkash_onetime",
              msisdn:
                (resultSelectUser[0] && resultSelectUser[0].phone_no) || "",
              amount: oneTimeData.amount || "",
              transaction_id: oneTimeData.paymentID || "",
              transaction_time: Date.now(),
              status: objExecutePayment.statusMessage || "",
              remarks: "",
              reason: oneTimeData.packageId || "",
              others_data: "",
            });
          }
        } catch (error) {
          console.error(error);
        }
        returnValue.success = true;
        return returnValue;
      }
      if (
        oneTimeData.trafficSource == "Banglalink" &&
        oneTimeData.platform == "app"
      ) {
        returnValue.fromSource = "Banglalink";
      }
      const sqlUpdateBkashOnetime = `
        UPDATE bkash_onetime SET 
        executeStatusCode = ?, 
        executeStatusMessage = ?
        WHERE paymentID = ?
      `;
      const resultUpdateBkashOnetime = await DB.query(sqlUpdateBkashOnetime, [
        objExecutePayment.statusCode,
        objExecutePayment.statusMessage,
        oneTimeData.paymentID,
      ]);
      returnValue.success = false;
      return returnValue;
    } catch (error) {
      console.log(error);

      returnValue.success = false;
      return returnValue;
    }
  };


  bkashOnetimeAudioBookPurchaseCallback = async (queryData) => {
    try {
      var returnValue = {
        success: true,
        fromSource: "kabbik",
        platform: "app",
      };
      if (!queryData.paymentID) {
        returnValue.success = false;
        return returnValue;
      }

      var extraUiInfo = {};

      const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
      const insertCategory = `INSERT INTO purchased_category (user_id, category_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;

      const storeLogFound = `SELECT * from store_log WHERE payment_id = ?`;

      var checkAudioBookPurchaseLog = await DB.query(storeLogFound, [
        queryData.paymentID,
      ]);


      if (checkAudioBookPurchaseLog.length < 1) {
        returnValue.success = false;
        return returnValue;
      }


      // return
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });


      var dataExecutePayment = {
        paymentId: queryData.paymentID,
      };

      const headersExecutePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      // const that = this

      const urlExecutePayment = URL_EXECUTE_PAYMENT_BKASH_ONETIME;
      var configExecutePayment = {
        method: "post",
        url: urlExecutePayment,
        headers: headersExecutePayment,
        data: dataExecutePayment,
      };
      const objExecutePayment = await axios(configExecutePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      const storeLogInsertQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, transaction_id = ?, status_message = ?  WHERE payment_id = ?`;

      if (objExecutePayment.transactionStatus === "Completed") {

        try {
          if (checkAudioBookPurchaseLog[0].purchase_type == "category") {

            const findCategory = `SELECT * from categories where id = ?`;

            const res = await DB.query(findCategory, [
              checkAudioBookPurchaseLog[0].product_id
            ]);

            extraUiInfo['title'] = "রেন্ট ক্যাটেগরি (Category Rent)";
            extraUiInfo['sub_title'] = `ক্যাটেগরি নাম: ${res[0].name}`;
            extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${res[0].price}`;

            await DB.query(insertCategory, [
              checkAudioBookPurchaseLog[0].user_id,
              checkAudioBookPurchaseLog[0].product_id,
              queryData.paymentID,
              res[0].rent_duration_day
            ]);

          }
          else {

            const findAudiobook = `SELECT * from audiobooks where id = ? limit 1`;

            const res = await DB.query(findAudiobook, [
              checkAudioBookPurchaseLog[0].product_id
            ]);


            extraUiInfo['title'] = "রেন্ট বুক (Book Rent)";
            extraUiInfo['sub_title'] = `বইয়ের নাম: ${res[0].name}`;
            extraUiInfo['short_description'] = `রেন্ট চার্জ: BDT.${res[0].price}`;

            await DB.query(insertQuery, [
              checkAudioBookPurchaseLog[0].user_id,
              checkAudioBookPurchaseLog[0].product_id,
              queryData.paymentID,
              res[0].rent_duration_in_day
            ]);
          }

        } catch (e) {
          console.log("errrrrrrrrrr", e)
        }

        await DB.query(storeLogInsertQuery, [
          1,
          objExecutePayment.transactionStatus,
          objExecutePayment.trxID,
          objExecutePayment.statusMessage,
          queryData.paymentID,
        ]);

        try {
          const findUsersSql = `SELECT * from users where id = ?`;
          const findUsers = await DB.query(findUsersSql, [
            checkAudioBookPurchaseLog[0].user_id
          ]);

          if (Object.keys(extraUiInfo).length === 0) {
            extraUiInfo = null;
          }

          await PaymenLogUtils.insertUserPaymentLog(
            checkAudioBookPurchaseLog[0].user_id,
            findUsers[0].user_name,
            findUsers[0].full_name,
            checkAudioBookPurchaseLog[0].product_id,
            "Bkash",
            checkAudioBookPurchaseLog[0].purchase_type,
            1,
            0,
            "SUCCEEDED_PAYMENT",
            1,
            null,
            objExecutePayment.trxID,
            checkAudioBookPurchaseLog[0].amount,
            checkAudioBookPurchaseLog[0].promo_code,
            0,
            null,
            checkAudioBookPurchaseLog[0].platform,
            checkAudioBookPurchaseLog[0].source,
            extraUiInfo ? JSON.stringify(extraUiInfo) : null
          );

        } catch (e) {
          console.log("Errrrrrrrrrrrrrror", e)
        }

        returnValue.success = true;
        return returnValue;
      }

      await DB.query(storeLogInsertQuery, [
        0,
        objExecutePayment.transactionStatus,
        objExecutePayment.trxID,
        objExecutePayment.statusMessage,
        queryData.paymentID,
      ]);

      returnValue.success = false;
      return returnValue;
    } catch (error) {
      console.log(error);

      returnValue.success = false;
      return returnValue;
    }
  };


  bkashOnetimeCoursePurchaseCallback = async (queryData) => {
    try {
      var returnValue = {
        success: true,
        fromSource: "kabbik",
        platform: "app",
      };
      if (!queryData.paymentID) {
        returnValue.success = false;
        return returnValue;
      }


      var extraUiInfo = {};


      const storeLogFound = `SELECT * from store_log WHERE payment_id = ?`;

      var checkCoursePurchaseLog = await DB.query(storeLogFound, [
        queryData.paymentID,
      ]);
      const storeLogInsertQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, transaction_id = ?, status_message = ?  WHERE payment_id = ?`;

      if (checkCoursePurchaseLog.length < 1) {
        returnValue.success = false;
        return returnValue;
      }

      // return
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const that = this;

      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      var dataExecutePayment = {
        paymentID: queryData.paymentID,
      };

      const headersExecutePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };

      // const that = this

      const urlExecutePayment = URL_EXECUTE_PAYMENT_BKASH_ONETIME;
      var configExecutePayment = {
        method: "post",
        url: urlExecutePayment,
        headers: headersExecutePayment,
        data: dataExecutePayment,
      };
      const objExecutePayment = await axios(configExecutePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      const coursePurchaseQuery = `INSERT INTO course_purchase_table 
            (user_id, name, email, phone, address,course_id, price, promo_code, is_purchased) VALUES (?,?,?,?,?,?,?,?,1)`;

      if (objExecutePayment.statusCode == "0000") {
        // console.log(nextPaymentDateTime)
        if (checkCoursePurchaseLog[0].purchase_type == "Course") {

          await DB.query(coursePurchaseQuery, [
            checkCoursePurchaseLog[0].user_id,
            checkCoursePurchaseLog[0].name,
            checkCoursePurchaseLog[0].email,
            checkCoursePurchaseLog[0].phone,
            checkCoursePurchaseLog[0].address,
            checkCoursePurchaseLog[0].product_id,
            checkCoursePurchaseLog[0].amount,
            checkCoursePurchaseLog[0].promo_code,
          ]);

          try {

            extraUiInfo['title'] = "কোর্স ক্রয়";
            const findCourseSql = `SELECT * from course where id = ? limit 1`;

            const res = await DB.query(findCourseSql, [
              checkCoursePurchaseLog[0].product_id
            ]);
            extraUiInfo['sub_title'] = `${res[0].name}`;
            extraUiInfo['short_description'] = `কোর্স ফি: BDT.${checkCoursePurchaseLog[0].amount}`;

          } catch (e) { }

        } else if (checkCoursePurchaseLog[0].purchase_type == "store") {
          const insertToStoreOrderTable = `INSERT INTO store_order (user_id, product_id, order_id, amount) VALUES ?`;
          let values = [];

          for (var item of JSON.parse(checkCoursePurchaseLog[0].store_item)) {
            values.push([
              checkCoursePurchaseLog[0].user_id,
              item.id,
              checkCoursePurchaseLog[0].product_id,
              item.offer_price,
            ]);
          }

          // Perform the bulk insert
          await DB.query(insertToStoreOrderTable, [values]);
        }

        await DB.query(storeLogInsertQuery, [
          1,
          objExecutePayment.transactionStatus,
          objExecutePayment.trxID,
          objExecutePayment.statusMessage,
          queryData.paymentID,
        ]);



        try {
          const findUsersSql = `SELECT * from users where id = ?`;
          const findUsers = await DB.query(findUsersSql, [
            checkCoursePurchaseLog[0].user_id
          ]);

          if (Object.keys(extraUiInfo).length === 0) {
            extraUiInfo = null;
          }

          await PaymenLogUtils.insertUserPaymentLog(
            checkAudioBookPurchaseLog[0].user_id,
            findUsers[0].user_name,
            findUsers[0].full_name,
            checkCoursePurchaseLog[0].product_id,
            "Bkash",
            checkCoursePurchaseLog[0].purchase_type,
            1,
            0,
            "SUCCEEDED_PAYMENT",
            1,
            null,
            objExecutePayment.trxID,
            checkCoursePurchaseLog[0].amount,
            checkCoursePurchaseLog[0].promo_code,
            0,
            null,
            checkCoursePurchaseLog[0].platform,
            checkCoursePurchaseLog[0].source,
            extraUiInfo ? JSON.stringify(extraUiInfo) : null
          );

        } catch (e) {
          console.log("Errrrrrrrrrrrrrror", e)
        }


        returnValue.success = true;
        return returnValue;
      }

      const updateStoreLog = await DB.query(storeLogInsertQuery, [
        0,
        objExecutePayment.transactionStatus,
        objExecutePayment.trxID,
        objExecutePayment.statusMessage,
        queryData.paymentID,
      ]);

      returnValue.success = false;
      return returnValue;
    } catch (error) {
      console.log(error);

      returnValue.success = false;
      return returnValue;
    }
  };

  bkashEbookFulfillPayment = async (paymentId) => {
    if (!paymentId) {
      return { success: false, message: "Missing paymentId" };
    }

    try {
      const voiceAcademyLogFound = `SELECT * FROM bkashVoiceAcademy WHERE payment_id = ?`;
      const checkVoiceAcademyLog = await DB.query(voiceAcademyLogFound, [
        paymentId,
      ]);

      if (checkVoiceAcademyLog.length < 1) {
        return { success: false, message: "Payment not found" };
      }

      const log = checkVoiceAcademyLog[0];
      if (log?.purchase_type?.toLowerCase() !== "ebook") {
        return { success: false, message: "Payment is not an ebook purchase" };
      }

      if (
        Number(log.is_succeed) === 1 ||
        String(log.delivery_status || "").toLowerCase() === "delivered"
      ) {
        return {
          success: true,
          message: "Payment confirmed",
          gateway_response: buildEbookGatewayResponseFromLog(
            log,
            paymentId,
            "Success",
          ),
        };
      }

      const dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };

      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const objGrantToken = await axios({
        method: "post",
        url: URL_GRANT_TOKEN_BKASH_ONETIME,
        headers: headersGrantToken,
        data: dataGrantToken,
      })
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.data && typeof error.response.data === "object") {
            return error.response.data;
          }
          return null;
        });

      if (!objGrantToken?.id_token) {
        return { success: false, message: "Could not authorize bKash payment" };
      }

      const objExecutePayment = await axios({
        method: "post",
        url: URL_EXECUTE_PAYMENT_BKASH_ONETIME,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: objGrantToken.id_token,
          "x-app-key": APPKEY_BKASH_ONETIME,
        },
        data: { paymentId },
      })
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.data && typeof error.response.data === "object") {
            return error.response.data;
          }
          return null;
        });

      const deliveryStatus = resolveEbookFulfillDeliveryStatus(
        log,
        objExecutePayment,
      );

      const gatewayResponse = {
        payment_id: paymentId,
        status: objExecutePayment?.transactionStatus || log.transaction_status || "Failed",
        transaction_id: objExecutePayment?.trxID ?? log.transaction_id,
        status_message:
          objExecutePayment?.statusMessage ||
          log.status_message ||
          (deliveryStatus === "Success" ? "Payment confirmed" : "Failed"),
        delivery_status: deliveryStatus,
        amount: log.amount,
        promo_code: log.promo_code,
        source: log.source,
        platform: log.platform,
        payment_method: "Bkash",
        purchase_type: log.purchase_type,
        enrollment_id: log.enrollment_id,
      };

      if (deliveryStatus === "Success") {
        await DB.query(
          `UPDATE bkashVoiceAcademy SET is_succeed = ?, transaction_status = ?, transaction_id = ?, status_message = ?, delivery_status = ? WHERE payment_id = ?`,
          [
            1,
            objExecutePayment?.transactionStatus ||
              log.transaction_status ||
              "Completed",
            objExecutePayment?.trxID ?? log.transaction_id,
            objExecutePayment?.statusMessage ||
              log.status_message ||
              "Payment confirmed",
            "delivered",
            paymentId,
          ],
        );
      }

      return {
        success: deliveryStatus === "Success",
        message:
          deliveryStatus === "Success"
            ? "Payment confirmed"
            : "Payment not completed",
        gateway_response: gatewayResponse,
      };
    } catch (error) {
      console.log("[bkashEbookFulfillPayment]", error);
      return { success: false, message: "Could not confirm payment" };
    }
  };

  bkashOnetimeVoiceAcademyCallback = async (queryData) => {
    console.log("-------------------------------------------------bkashOnetimeVoiceAcademyCallback-------------------------------------------------",queryData);
    var returnValue = {
      success: true,
      fromSource: "voiceAcademy",
      platform: "Web",
    };
  
    try {
      let paymentId = queryData.paymentId || queryData.paymentID;
            if (!paymentId) {
        returnValue.success = false;
        return returnValue;
      }

      console.log("-------------------------------------------------queryData-------------------------------------------------",queryData);


  
      var extraUiInfo = {};
  
      const voiceAcademyLogFound = `SELECT * FROM bkashVoiceAcademy WHERE payment_id = ?`;
  
      var checkVoiceAcademyLog = await DB.query(voiceAcademyLogFound, [
        paymentId,
      ]);
      console.log(checkVoiceAcademyLog[0],"amar log found");

      if(checkVoiceAcademyLog[0]?.purchase_type==='ebook'){
        returnValue.type='ebook'
      }

      returnValue.enrollment_id = checkVoiceAcademyLog[0]?.enrollment_id;
        
      const voiceAcademyUpdateQuery = `UPDATE bkashVoiceAcademy SET is_succeed = ?, transaction_status = ?, transaction_id = ?, status_message = ?, delivery_status = ? WHERE payment_id = ?`;

      console.log("-------------------------------------------------checkVoiceAcademyLog-------------------------------------------------",checkVoiceAcademyLog);
  
      if (checkVoiceAcademyLog.length < 1) {
        returnValue.success = false;
        return returnValue;
      }
  
      var dataGrantToken = {
        app_key: APPKEY_BKASH_ONETIME,
        app_secret: APP_SECRET_BKASH_ONETIME,
      };
  
      const headersGrantToken = {
        username: USERNAME_BKASH_ONETIME,
        password: PASSWORD_BKASH_ONETIME,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
  
      const urlGrantToken = URL_GRANT_TOKEN_BKASH_ONETIME;
      var config = {
        method: "post",
        url: urlGrantToken,
        headers: headersGrantToken,
        data: dataGrantToken,
      };
  
      const objGrantToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
  
      var dataExecutePayment = {
        paymentId: paymentId,
      };
  
      const headersExecutePayment = {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: objGrantToken.id_token,
        "x-app-key": APPKEY_BKASH_ONETIME,
      };
  
      const urlExecutePayment = URL_EXECUTE_PAYMENT_BKASH_ONETIME;
      var configExecutePayment = {
        method: "post",
        url: urlExecutePayment,
        headers: headersExecutePayment,
        data: dataExecutePayment,
      };

      
      const objExecutePayment = await axios(configExecutePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
              return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

        console.log(objExecutePayment.status,objExecutePayment.statusCode,objExecutePayment);
        returnValue.enrollment_id = checkVoiceAcademyLog[0].enrollment_id;

        let payloadData = {
          "gateway_response": {
            "payment_id": paymentId,
            "status": objExecutePayment.transactionStatus || "Failed",
            "transaction_id": objExecutePayment.trxID,
            "status_message": objExecutePayment.statusMessage || "Failed",
            "delivery_status": objExecutePayment.statusCode == "0000"?"Success":(objExecutePayment.transactionStatus || "Failed"),
            "amount": checkVoiceAcademyLog[0].amount,
            "promo_code": checkVoiceAcademyLog[0].promo_code,
            "source": checkVoiceAcademyLog[0].source,
            "platform": checkVoiceAcademyLog[0].platform,
            "payment_method": "Bkash",
            "purchase_type": checkVoiceAcademyLog[0].purchase_type,
            "enrollment_id": checkVoiceAcademyLog[0].enrollment_id,
          }
        };
        
        if(checkVoiceAcademyLog[0]?.purchase_type?.toLowerCase() === "course"){
          payloadData["student_id"] =  checkVoiceAcademyLog[0]?.user_id;
          payloadData["enrollment_id"] = checkVoiceAcademyLog[0]?.enrollment_id;

          await axios.post("https://voice-be.wondersoftsolution.com/payment", payloadData
          )
          .then(function (response) {
                    })
          .catch(function (error) {});
          
        }else if(checkVoiceAcademyLog[0]?.purchase_type?.toLowerCase() === "ebook"){

          payloadData["orderId"] = normalizeEbookOrderId(
            checkVoiceAcademyLog[0]?.store_item,
          );
          payloadData["userId"] =  checkVoiceAcademyLog[0]?.user_id;
          console.log(payloadData,"payloadData")

          await axios.post("https://kabbik-ebook-backend.vercel.app/api/payments/webhook",    payloadData,
            {
              headers: {
                "x-payment-webhook-secret": "kabbik_webhook",
              },
            }
          )
          .then(function (response) {
            console.log(response)
                    })
          .catch(function (error) {});
        }

       

        console.log("-------------------------------------------------payloadData-------------------------------------------------",payloadData);

        
        
  
      if (objExecutePayment.statusCode == "0000") {
        // Payment succeeded — mark the enrollment as paid/delivered
        try {
          extraUiInfo["title"] = "ভয়েস একাডেমি ক্রয়";
          const findEnrollmentSql = `SELECT * FROM enrollment WHERE id = ? LIMIT 1`;
  
          const res = await DB.query(findEnrollmentSql, [
            checkVoiceAcademyLog[0].enrollment_id,
          ]);
          if (res && res[0]) {
            extraUiInfo["sub_title"] = `${res[0].name}`;
          }
          extraUiInfo["short_description"] = `ফি: BDT.${checkVoiceAcademyLog[0].amount}`;
        } catch (e) {console.log("-------------------------------------------------error2963-------------------------------------------------",e);}
  
        await DB.query(voiceAcademyUpdateQuery, [
          1,
          objExecutePayment.transactionStatus,
          objExecutePayment.trxID,
          objExecutePayment.statusMessage,
          "delivered",
          paymentId,
        ]);
  
        try {
          const findUsersSql = `SELECT * FROM users WHERE id = ?`;
          const findUsers = await DB.query(findUsersSql, [
            checkVoiceAcademyLog[0].user_id,
          ]);
  
          if (Object.keys(extraUiInfo).length === 0) {
            extraUiInfo = null;
          }
  
          
        } catch (e) {
          console.log("Errrrrrrrrrrrrrror", e);
        }
  
        returnValue.success = true;
        return returnValue;
      }
  
      // Payment failed
      await DB.query(voiceAcademyUpdateQuery, [
        0,
        objExecutePayment.transactionStatus,
        objExecutePayment.trxID,
        objExecutePayment.statusMessage,
        objExecutePayment.transactionStatus,
        paymentId,
      ]);
      
      
      
      console.log(objExecutePayment.transactionStatus,returnValue,"lala")
      if(objExecutePayment.transactionStatus == "Completed"){
        returnValue.success = true;
        return returnValue;
      }
      returnValue.success = false;
      return returnValue;
    } catch (error) {
      console.log(error);
      returnValue.success = false;
      return returnValue;
    }
  };

  //arrried
  getBkashQuerySubscriptionRequest = async (
    subscription_request_id,
    headersData
  ) => {
    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    const that = this;
    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/request-id/" +
        subscription_request_id;

      var config = {
        method: "get",
        url: url,
        headers: headers,
      };

      const obj = await axios(config)
        .then(function (response) {
          that.addResponseQueryData(JSON.stringify(response.data));

          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("Failed");
      return null;
    }
  };

  bkashCancelSubscription_mc = async (subscriptionRequestId) => {
    const headers = {
      version: "v1.0",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "cLc3Pfm53pWuSIxsbbnUjaped5qNOJr9",
      "Content-Type": "application/json",
    };

    try {

      const subscriptionIdFindSql = `SELECT * from bkash_mc_webhook where subscriptionRequestId = ? AND paymentStatus = ? AND firstPayment = ?`;
      const res = await DB.query(subscriptionIdFindSql, [
        subscriptionRequestId,
        "SUCCEEDED_PAYMENT",
        "1"
      ]);

      const subscriptionId = res[0].subscriptionId
      var url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/" + subscriptionId + "?reason=User_Requested";

      var config = {
        method: "delete",
        url: url,
        headers: headers,
      };
      const response = await axios(config)
        .then((response) => response.data)
        .catch(() => null);

      const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE subscription_id = ?`;
      await DB.query(sqlUpdateUser, [
        1,
        subscriptionId,
      ]);

      return response;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };


  getBkashPaymentListSubscriptionID = async (subscription_id, headersData, url,
    newHeader) => {
    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    const that = this;
    try {
      var url = (url
        ? url
        : "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/bySubscriptionId/") +
        subscription_id;

      var config = {
        method: "get",
        url: url,
        headers: newHeader ? newHeader : headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          that.addResponsePaymentQueryData(JSON.stringify(response.data));
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log(error);
      console.log("Failed");
      return null;
    }
  };

  getBkashPaymentInfoByPaymentID = async (paymentid, headersData) => {
    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/" +
        paymentid;
      var config = {
        method: "get",
        url: url,
        headers: headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("Failed");
      return null;
    }
  };

  getBkashCancelSubscription = async (req) => {
    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {

      var url = `https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/${req.body.subscriptionId}?reason=User Requested`;

      var config = {
        method: "delete",
        url: url,
        headers: headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashCancelSubscriptionApp = async (
    req,
    userId,
    subscriptionId,
    reason,
    headersData
  ) => {
    try {
      // const sqlUser = `SELECT * from users WHERE id = ?`;

      // var resultUser = await DB.query(sqlUser, [userId]);


      const sqlUser = ` SELECT * from users as us JOIN user_payment_log as ul ON  us.subscription_id = ul.subscription_id  WHERE us.id = ? AND ul.payment_status = 'SUCCEEDED_PAYMENT' LIMIT 1`;

      var resultUser = await DB.query(sqlUser, [userId]);


      if (resultUser[0].source == "Bkash-Microsite") {
        const res = this.bkashCancelSubscription_mc(resultUser[0].subscription_id);
        if (!res) {
          return null;
        } else {
          return res;
        }
      }


      var currentDateTime = new Date().getTime();
      var queryByRequestId = await this.getBkashQuerySubscriptionRequest(
        resultUser[0].subscription_id,
        headersData
      );

      if (queryByRequestId.status == "CANCELLED") {
        if (resultUser[0].next_purchase_time < currentDateTime) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?,   canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            false,
            0,
            resultUser[0].id,
          ]);
        } else {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            true,
            1,
            resultUser[0].id,
          ]);
        }
        return "Already cancelled";
      }
      const headers = {
        version: "v1.2",
        channelId: "Merchant WEB",
        timeStamp: "2021-08-24T12:04:31.353163Z",
        "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
        "Content-Type": "application/json",
      };
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/" +
        queryByRequestId.id +
        "?reason=" +
        reason;

      var config = {
        method: "delete",
        url: url,
        headers: headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });

      if (obj.subscriptionStatus == "CANCELLED") {
        if (resultUser[0].next_purchase_time < currentDateTime) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ? ,  canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            false,
            0,
            resultUser[0].id,
          ]);
        } else {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            true,
            1,
            resultUser[0].id,
          ]);
        }
      }

      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "CancelBkashSubscription",
        endpoint: "/v3/bkash/bkash-cancel-subscription-app",
        forTask: "Subscription",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashQueryBySubscriptionID = async (subscriptionId, headersData, newHeaders,
    url) => {
    const headers = {
      // 'version': headersData.version,
      // 'channelId': headersData.channelid,
      // 'timeStamp': headersData.timestamp,
      // 'x-api-key': headersData.xapikey,
      // 'Content-Type': headersData.contenttype

      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {
      var url =
        (url
          ? url
          : "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/") +
        subscriptionId;

      var config = {
        method: "get",
        url: url,
        headers: newHeaders ? newHeaders : headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashQueryBySubscriptionIDAndUpdate = async (
    userId,
    subscriptionId,
    headersData
  ) => {
    var resultUser;
    const sqlUser = `SELECT * from users WHERE id = ? AND payment_method = ?`;

    resultUser = await DB.query(sqlUser, [userId, "bKash"]);

    var currentDateTime = new Date().getTime();
    const headers = {
      // 'version': headersData.version,
      // 'channelId': headersData.channelid,
      // 'timeStamp': headersData.timestamp,
      // 'x-api-key': headersData.xapikey,
      // 'Content-Type': headersData.contenttype

      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/" +
        subscriptionId;

      var config = {
        method: "get",
        url: url,
        headers: headers,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      if (obj.status == "CANCELLED") {
        if (resultUser[0].next_purchase_time < currentDateTime) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?,  purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            false,
            currentDateTime,
            0,
            resultUser[0].id,
          ]);
        } else {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, canceled_subscription = ? WHERE id = ?`;

          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            true,
            1,
            resultUser[0].id,
          ]);
        }
      }
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashRefundPayment = async (paymentId, amount, headersData) => {
    var data = {
      paymentId: paymentId,
      amount: amount,
    };

    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/refund";
      var config = {
        method: "post",
        url: url,
        headers: headers,
        data: data,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashPaymentSchedule = async (
    frequency,
    startDate,
    expiryDate,
    headersData
  ) => {
    const headers = {
      version: "v1.2",
      channelId: "Merchant WEB",
      timeStamp: "2021-08-24T12:04:31.353163Z",
      "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
      "Content-Type": "application/json",
    };

    try {
      var url =
        "https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/schedule?frequency=" +
        frequency +
        "&" +
        "startDate=" +
        startDate +
        "&" +
        "expiryDate=" +
        expiryDate;

      var config = {
        method: "get",
        url: url,
        headers: headers,
      };

      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return  StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  getBkashRedirect = async (queryData) => {
    try {
      const value =
        '"cameFrom":"https://intent.sbrecurring.pay.bka.sh/intent/web/intent/' +
        queryData.reference +
        '","reference":"' +
        queryData.reference +
        '","reference":"' +
        queryData.status +
        '"';
      return this.addResponseDataRedirect(value);
    } catch (error) {
      console.log("" + error);
      return null;
    }
  };

  async addResponseData(message) {
    const insertSql =
      "INSERT INTO bkash_recurring(created_subscription, message) VALUES (?,?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [1, message]);
      if (resultsInsertSql) {
      }
    } catch (error) {
      console.log(error);
    }
  }

  async addResponseDataCreate(data, req) {
    var userId = req.body.USERID;
    var packageId = req.body.PACKAGEID;
    var amount = req.body.AMOUNT || 0;

    var promoCode = "";
    var querySource = "";
    var platform = "";
    var channel = "global";
    if (req.body.promo_code) {
      promoCode = req.body.promo_code;
    }
    if (req.body.channel) {
      channel = req.body.channel;
    }

    if (req.query.source) {
      querySource = req.query.source;
    }

    if (req.query.platform) {
      platform = req.query.platform;
    }
    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    try {
      GlobalTask.insertLogsOptional({
        USERID: userId ? userId : "",
        userAction: "CreateBkashSubscription",
        endpoint: "/v3/bkash/bkash-create-subscription-request-app",
        forTask: "Subscription",
        source: querySource,
        platform: req.query.platform,
        user_ip: user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const tracker = data.redirectURL.substring(
        data.redirectURL.lastIndexOf("/") + 1
      );

      const sql = `INSERT INTO bkash_invoice (userId, redirectURL, subscriptionRequestId, split_part, expirationTime, timeStamp,package_id, promoCode, channel, source, platform, amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);`;
      const results = await DB.query(sql, [
        userId,
        data.redirectURL,
        data.subscriptionRequestId,
        tracker,
        data.expirationTime,
        data.timeStamp,
        packageId,
        promoCode,
        channel,
        querySource,
        platform,
        amount,
      ]);

      const d = new Date();
      let timeMi = d.getTime();
      const sqlUp = `UPDATE users SET package_id = ?, payment_method = ?, purchase_time = ?, subscription_id = ? WHERE id = ?`;

      const resultnew = await DB.query(sqlUp, [
        packageId,
        "bKash",
        timeMi,
        data.subscriptionRequestId,
        userId,
      ]);
      if (results) {
        return results;
      }
    } catch (error) {
      return {
        status: "Failed",
        redirectUrl: null,
      };
    }
  }

  async addResponseDataCreateBkashMicrosite(data, req) {
    var userId = req.body.USERID;
    var packageId = req.body.PACKAGEID;
    var amount = req.body.AMOUNT || 0;

    var promoCode = "";
    var querySource = "";
    var platform = "";
    var channel = "global";
    if (req.body.promo_code) {
      promoCode = req.body.promo_code;
    }
    if (req.body.channel) {
      channel = req.body.channel;
    }

    if (req.query.source) {
      querySource = req.query.source;
    }

    if (req.query.platform) {
      platform = req.query.platform;
    }
    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    try {
      GlobalTask.insertLogsOptional({
        USERID: userId ? userId : "",
        userAction: "CreateBkashSubscription",
        endpoint:
          "/v3/bkash/bkash-create-subscription-request-app-bkash-microsite",
        forTask: "Subscription",
        source: querySource,
        platform: req.query.platform,
        user_ip: user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const tracker = data.redirectURL.substring(
        data.redirectURL.lastIndexOf("/") + 1
      );

      const sql = `INSERT INTO bkash_invoice (userId, redirectURL, subscriptionRequestId, split_part, expirationTime, timeStamp,package_id, promoCode, channel, source, platform, amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);`;
      const results = await DB.query(sql, [
        userId,
        data.redirectURL,
        data.subscriptionRequestId,
        tracker,
        data.expirationTime,
        data.timeStamp,
        packageId,
        promoCode,
        channel,
        querySource,
        platform,
        amount,
      ]);

      const d = new Date();
      let timeMi = d.getTime();
      const sqlUp = `UPDATE users SET package_id = ?, payment_method = ?, purchase_time = ?, subscription_id = ? WHERE id = ?`;

      const resultnew = await DB.query(sqlUp, [
        packageId,
        "bKash",
        timeMi,
        data.subscriptionRequestId,
        userId,
      ]);
      if (results) {
        return results;
      }
    } catch (error) {
      return {
        status: "Failed",
        redirectUrl: null,
      };
    }
  }

  giveAccessToQuiz=async(result)=>{
        
    if (
        result[0].promoCode === "QUIZ26WORLDCUP" || 
        result[0].promoCode === "QUIZ26WORLDCUPNEXT" ||
        result[0].promo_code === "QUIZ26WORLDCUP" ||
        result[0].promo_code === "QUIZ26WORLDCUPNEXT"
      ) {
      let isToday=(result[0].promoCode === "QUIZ26WORLDCUP")||(result[0].promo_code === "QUIZ26WORLDCUP");
      let today = new Date();

      let minDate = new Date("2026-06-12T00:00:00Z");

      let effectiveDate = today < minDate ? minDate : today;
      let nextDay = new Date(today);
      nextDay.setDate(today.getDate() + 1);
      nextDay = nextDay < minDate ? minDate : nextDay;

      let formatDate = (date) => {
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, "0");
        let day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      };
      const quizSql = `
        INSERT INTO quiz_access (user_id, access_date, created_at, updated_at)
        VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      `;
     DB.query(quizSql, [result[0].userId, formatDate(isToday?effectiveDate:nextDay)])
  }
  }

  addResponseDataRedirectSuccess = async (reference) => {
    var returnValue = {
      success: false,
      fromSource: "kabbik",
      platform: "app",
    };
    try {
      const insertSql = "SELECT * FROM bkash_invoice WHERE split_part = ?;";
      const result = await DB.query(insertSql, [reference]);
       if (result && result.length > 0) {
        returnValue.payer=result[0]?.payer;
                
        if (result[0].source == "Banglalink" && result[0].platform == "app") {
          returnValue.fromSource = "Banglalink";
          returnValue.platform = "app";
        }

        


        const headers = {
          version: "v1.2",
          channelId: "Merchant WEB",
          timeStamp: "2021-08-24T12:04:31.353163Z",
          "x-api-key": "NKkPZkWrRjvI7zozYxPg4SQlrJLPQAnL",
          "Content-Type": "application/json",
        };


        var url = "https://gateway.recurring.pay.bka.sh/gateway/api/subscriptions/request-id/" + result[0].subscriptionRequestId;

        var config = {
          method: "get",
          url: url,
          headers: headers,
        };

        const response = await axios(config);
        const obj = response.data;

        if (obj.subscriptionType === 'BASIC') {
          var findWebhookSql = `SELECT paymentStatus from bkash_webhook where subscriptionRequestId = ?`
          const webhookRes = await DB.query(findWebhookSql, [obj.subscriptionRequestId]);
                    if (webhookRes.length > 0 && webhookRes[0].paymentStatus === 'SUCCEEDED_PAYMENT') {
            returnValue.success = true;

          } else {
            returnValue.message = "Payment Status Failed";
            returnValue.success = false;
          }
          return returnValue;
        }

        config.url = `https://gateway.recurring.pay.bka.sh/gateway/api/subscription/payment/bySubscriptionId/${obj.id}`;

        const subscriptionDetails = await axios(config);

        if (subscriptionDetails.data?.[0]?.status === "SUCCEEDED_PAYMENT") {
          returnValue.success = true;
        }
        else {
          returnValue.message = subscriptionDetails.data?.[0]?.status || "Payment Status Failed";
          returnValue.success = false;
        }
                if(returnValue===true || returnValue?.success===true){
          this.giveAccessToQuiz(result)
        }
        return returnValue;
      }
        throw new Error("Invoice not found");
     } catch (e) {
      console.log(e);
      
      returnValue.message = e.message || "Some things went wrong";
      return returnValue;
    }
  };


  addResponseDataRedirectSuccessBkashMicrosite = async (reference) => {
    var returnValue = {
      success: true,
      fromSource: "bkash",
      platform: "app",
    };
    try {
      const insertSql = "SELECT * FROM bkash_invoice WHERE split_part = ?;";
      const result = await DB.query(insertSql, [reference]);
      if (result) {
        const d = new Date();
        let timeMi = d.getTime();
        var getpaymentDetailsBySubscriptionId =
          await this.getBkashQuerySubscriptionRequest(
            result[0].subscriptionRequestId,
            null
          );

        const sqlPayer = `UPDATE bkash_invoice set payer =? WHERE split_part = ?;`;
        const resultPayer = await DB.query(sqlPayer, [
          getpaymentDetailsBySubscriptionId.payer,
          reference,
        ]);

        var paymentDetailsBySubscriptionId =
          await this.getBkashQueryBySubscriptionID(
            getpaymentDetailsBySubscriptionId.id,
            null
          );
        var paymentDetailsData = await this.getBkashPaymentListSubscriptionID(
          getpaymentDetailsBySubscriptionId.id,
          null
        );

        var lastPayment;
        if (paymentDetailsData.length > 0) {
          var lastPayment = paymentDetailsData[paymentDetailsData.length - 1];
          if (lastPayment.status == "FAILED_PAYMENT") {
            returnValue.success = false;
          } else {
            returnValue.success = true;
          }
        } else {
          returnValue.success = false;
        }

        if (result[0].source == "Banglalink" && result[0].platform == "app") {
          returnValue.fromSource = "Banglalink";
        }
        return returnValue;
      }
    } catch (e) {
      console.log(e);
      return returnValue;
    }
  };

  addResponseDataRedirectSuccessBkashApp = async (reference) => {
    var returnValue = true;
    try {
      const insertSql = "SELECT * FROM bkash_invoice WHERE split_part = ?;";
      const result = await DB.query(insertSql, [reference]);
      if (result) {
        const d = new Date();
        let timeMi = d.getTime();
        var getpaymentDetailsBySubscriptionId =
          await this.getBkashQuerySubscriptionRequest(
            result[0].subscriptionRequestId,
            null
          );

        const sqlPayer = `UPDATE bkash_invoice set payer =? WHERE split_part = ?;`;
        const resultPayer = await DB.query(sqlPayer, [
          getpaymentDetailsBySubscriptionId.payer,
          reference,
        ]);

        var paymentDetailsBySubscriptionId =
          await this.getBkashQueryBySubscriptionID(
            getpaymentDetailsBySubscriptionId.id,
            null
          );
        var paymentDetailsData = await this.getBkashPaymentListSubscriptionID(
          getpaymentDetailsBySubscriptionId.id,
          null
        );
        var lastPayment;
        if (paymentDetailsData.length > 0) {
          var lastPayment = paymentDetailsData[paymentDetailsData.length - 1];
          if (lastPayment.status == "FAILED_PAYMENT") {
            returnValue = false;
          } else {
            returnValue = true;
          }
        } else {
          returnValue = false;
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
      console.log(e);
      return returnValue;
    }
  };

  async addResponseQueryData(message) {
    const insertSql =
      "INSERT INTO bkash_recurring(response_query_data, message) VALUES (?,?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [1, message]);
      if (resultsInsertSql) {
      }
    } catch (error) {
      console.log(error);
    }
  }

  async addResponsePaymentQueryData(message) {
    // const insertSql = 'INSERT INTO bkash_recurring(response_query_payment_data, message) VALUES (?,?);'
    // try {
    //     const resultsInsertSql = await DB.query(insertSql, [1, message]);
    //     if (resultsInsertSql) {
    //         console.log("Updated")
    //     }
    // } catch (error) {
    //     console.log(error);
    // }
  }

  async addResponseDataRedirect(message) {
    // console.log("v: "+dto);
    const insertSql =
      "INSERT INTO bkash_recurring(redirect_message, message) VALUES (?,?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [1, message]);
      if (resultsInsertSql) {
        return resultsInsertSql;
      }
    } catch (error) {
      console.log(error);
    }
    // return result;
  }
}

module.exports = new BkashModel();
