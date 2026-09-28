const {
  GP_DCB_PRODUCTION_URL,
  KABBIK_BACKEND_API,
} = require("../../utils/constants");
const { makeSubscriptionId } = require("./user-model-v4");
const DB = require("../db");
const moment = require("moment");
const PaymentHelper = require("../../utils/payment-helper");

class GpModel {
  getAccessToken = async (forACR = false) => {
    try {
      const userName = !forACR
        ? process.env.TELENOR_LINX_PRODUCTION_GENERAL_USERNAME
        : process.env.TELENOR_LINX_PRODUCTION_GENERAL_USERNAME,
        password = !forACR
          ? process.env.TELENOR_LINX_PRODUCTION_GENERAL_PASSWORD
          : process.env.TELENOR_LINX_PRODUCTION_GENERAL_PASSWORD;
      const response = await fetch(
        `${GP_DCB_PRODUCTION_URL}/payment/v2/oauth/token`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(`${userName}:${password}`)}`,
          },
        }
      );
      if (!response.ok) {
        throw Error("Could not get access token");
      }
      const result = await response.json();
      return result.access_token;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  refreshToken = async (GP_ACCESS_TOKEN) => {
    try {
      const response = await fetch(
        `${GP_DCB_PRODUCTION_URL}/payment/v2/oauth/check`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
          },
        }
      );
      if (!response.ok) {
        throw Error("Could not get status of access token");
      }
      const result = await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  createPayment = async (req) => {
    try {
      let type =req.body.type;
      const userId = req.body.userId;
      const msisdn = req.body.msisdn;
      const packageId = req.body.packageId;
      let productId= req.body.productId;

      if (!userId || !msisdn || !(packageId || type)) {

        return {
          success: false,
          msisdn: "UserId, msisdn, Or packageId Not found"
        }
      }

      const GP_ACCESS_TOKEN = await this.getAccessToken();
      const paymentId = makeSubscriptionId(20);
      let period =
        packageId === "4"
          ? "P1D"
          : packageId === "1"
            ? "P1M"
            : packageId === "2"
              ? "P6M"
              : "P1Y";
        // if(type){
        //   let dayCount=req.body.durationDay;
        //   period=`P${dayCount}D`
        // }
      
            let packageName =
        packageId === "4"
          ? "Daily"
          : packageId === "1"
            ? "Monthly"
            : packageId === "2"
              ? "Half Yearly"
              : "Yearly";

        if(type==='quiz' || type==='category'){
          period =  "P1D" ; 
          packageName="Daily";
        }
        let productName = req.body.productName;
        
      const amount = Number(((req.body.amount * 1.01) / 1.15).toFixed(2));
      const consentPreparationPayload = {
        amount,
        currency: req.body.currency,
        msisdn: req.body.msisdn,
        productDescription: productName || `Kabbik - ${packageName} Subscription`,
        subscriptionPeriod: period,
	      merchant:"kabbik",
        urls: {
          ok: `${KABBIK_BACKEND_API}/v4/gp/redirect-url/ok?paymentId=${paymentId}`,
          deny: `${KABBIK_BACKEND_API}/v4/gp/redirect-url/deny?paymentId=${paymentId}`,
          error: `${KABBIK_BACKEND_API}/v4/gp/redirect-url/error?paymentId=${paymentId}`,
        },
      };

      // if(type){
      //   delete consentPreparationPayload.subscriptionPeriod;
      // }

	      const consentPreparationResponse = await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/v3/consent/prepare`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(consentPreparationPayload),
        }
      );

      if (!consentPreparationResponse.ok) {
        let errorBody;
        try {
          errorBody = await consentPreparationResponse.json();
        } catch {
          errorBody = await consentPreparationResponse.text();
        }

        return {
          success: false,
          statusCode: consentPreparationResponse.status,
          body: errorBody
        };
      }

      const queryInsertLog = `
        INSERT INTO gp_payments (
          user_id,
          msisdn,
          subscription_id,
          payment_id,
          package_id,
          renewal,
          amount,
          promo_code,
          transaction_status,
          first_payment,
          purpose,
          payment_init_request_payload,
          payment_init_response_body,
          traffic_source,
          platform
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      

      const consentPreparationResult = await consentPreparationResponse.json();
      PaymentHelper.insertCpaMarketingRecord(userId, packageId, req.body.clickId, req.body.pubId, "GP", amount);
      await DB.query(queryInsertLog, [
        req.body.userId,
        req.body.msisdn,
        makeSubscriptionId(20),
        paymentId,
        req.body.packageId,
        req.body.renewal,
        amount,
        req.body.promoCode,
        "Initiated",
        1,
        req.body.purpose,
        JSON.stringify(consentPreparationPayload),
        JSON.stringify(consentPreparationResult),
        req.body.trafficSource,
        req.body.platform,
      ]);

      if(type){
        const storeLogInsertQuery = `INSERT INTO store_log (user_id, name, phone, payment_id, transaction_id, transaction_status, status_message, amount, promo_code, source, platform, payment_method,  purchase_type, product_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        
        await DB.query(storeLogInsertQuery, [
           userId,
            productName,
            req.body.msisdn,
            paymentId,
            '',
            "INITIALIZED",
            "CREATED",
            amount,
            req.body.promo_code ?? "",
            req.body.source,
            req.body.platform,
            "GPDCB",
            type,
            productId
        ]);
      }

      return consentPreparationResult;
    } catch (err) {
      console.log(err)
      return {
        success: false,
        message: err.message || "Something went wrong"
      }
    }
  };

  giveAccessToQuiz=async(result,fromAutorenewal=false)=>{
    if (result[0].promo_code === "QUIZ26WORLDCUP" || result[0].promo_code === "QUIZ26WORLDCUPNEXT") {
      let isToday=result[0].promo_code === "QUIZ26WORLDCUP";
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
      // let date = fromAutorenewal? nextDay :(isToday?effectiveDate:nextDay);
      if(fromAutorenewal){
        DB.query(quizSql, [result[0].user_id, formatDate(nextDay)])
      }else{
        DB.query(quizSql, [result[0].user_id, formatDate(today)])
        DB.query(quizSql, [result[0].user_id, formatDate(nextDay)])
      }
  }
  }


  makePayment = async (req) => {
    try {
      // check if query params exist and paymentId matches

      
      const customerReference = req.query.customerReference;
      const paymentId = req.query.paymentId;
      const consentId = req.query.consentId;

      if (
        !customerReference || !paymentId || !consentId
      )
        return { success: false, message: "Missing parameters" };



      const querySearchPaymentLog = `
        SELECT * FROM gp_payments
        WHERE payment_id = ?
      `;

      const store_PaymentLog = `
        SELECT * FROM store_log
        WHERE payment_id = ? limit 1
      `;

      const resultSearchPaymentLog = await DB.query(querySearchPaymentLog, [
        paymentId,
      ]);

      const resultStoreLog = await DB.query(store_PaymentLog, [
        paymentId,
      ]);
      
      if (!(resultSearchPaymentLog.length  ))
        return { success: false, message: "Initial payment log not found" };

      const GP_ACCESS_TOKEN = await this.getAccessToken();
      const packageId = resultSearchPaymentLog[0].package_id;
      const category = resultStoreLog[0]?.name;
      const type = resultStoreLog[0]?.purchase_type;

      const chargePayload = {
        amountTransaction: {
          endUserId: customerReference,
          transactionOperationStatus: "Charged",
          referenceCode: `REF-${makeSubscriptionId(20)}`,
          paymentAmount: {
            chargingInformation: {
              amount: resultSearchPaymentLog[0].amount,
              description: [
                category ||
                (packageId === 4
                  ? "Kabbik - Daily Subscription"
                  : packageId === 1
                    ? "Kabbik - Monthly Subscription"
                    : packageId === 2
                      ? "Kabbik - Half Yearly Subscription"
                      : "Kabbik - Yearly Subscription"),
              ],
              currency: "BDT",
            },
            chargingMetaData: {
              productId: "Kabbik",
              channel: resultSearchPaymentLog[0].platform == 'app' ? "SelfApp" : "SelfWeb",
              mandateId: {
                subscription: resultSearchPaymentLog[0].subscription_id,
                consentId: consentId,
                subscriptionPeriod:
                  packageId === 4
                    ? "P1D"
                    : packageId === 1
                      ? "P1M"
                      : packageId === 2
                        ? "P6M"
                        : "P1Y",
              },
            },
          },
        },
      };

      if(category?.length){
        delete chargePayload.amountTransaction?.chargingMetaData?.mandateId?.subscriptionPeriod
              }

      const chargeResponse = await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/payment/v1/${customerReference}/transactions/amount`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chargePayload),
        }
      );
      
      if (chargeResponse.status !== 201)
      // if(false)
         {
        const error = await chargeResponse.json();
                let failedReturnRes = {
          success: false,
          message: "Something went wrong"
        }
        let rechargeInitPayload;
        let rechargeInitResponse;

        if (error.requestError.policyException?.messageId === "POL1000") {
          const rechargeRes = await this.rechargeAndbuy(customerReference, chargePayload.amountTransaction.referenceCode, paymentId, GP_ACCESS_TOKEN);

          rechargeInitPayload = rechargeRes.requestPayload;
          rechargeInitResponse = rechargeRes.response

                    if (rechargeRes.success == true) {
            failedReturnRes.rechargeUrl = rechargeRes.response.continueUrl;
            failedReturnRes.message = "Successfully initiate recharge";
          }
        }
        else if (error.requestError.policyException?.messageId === "POL0001") {
          failedReturnRes.message = "Invalid PIN or Expired ACR";
        }
        else if (error.requestError.policyException?.messageId === "POL1001") {
          failedReturnRes.message = "Attempts exceeded. Please try again later";
        }
        const queryUpdateTransaction = `
          UPDATE gp_payments
          SET charge_request_payload = ?,
              charge_error_response = ?,
              recharge_init_payload = ?,
              recharge_request_response = ?,
              customer_reference = ?,
              consent_id = ?
          WHERE payment_id = ?
        `;

        await DB.query(queryUpdateTransaction, [
          JSON.stringify(chargePayload),
          JSON.stringify(error),
          JSON.stringify(rechargeInitPayload),
          JSON.stringify(rechargeInitResponse),
          customerReference,
          consentId,
          paymentId,
        ]);
        
        return failedReturnRes;
      }
            let numberOfDaysToAdd =
        packageId === 4
          ? 1
          : packageId === 1
            ? 30
            : packageId === 2
              ? 180
              : 365;

      if (resultSearchPaymentLog[0].promo_code === "QUIZ26WORLDCUP" || resultSearchPaymentLog[0].promo_code === "QUIZ26WORLDCUPNEXT") {
        numberOfDaysToAdd = 30;
      }

      var someDate = new Date();
      someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
      someDate.setHours(23, 29, 0, 0);
      var nextPaymentDateTime = someDate.getTime();
            const paymentResult = await chargeResponse.json();
      const now = new Date();
      const currentDateTime = now.valueOf();

      const transactionId = paymentResult.amountTransaction?.resourceURL?.slice(
        paymentResult.amountTransaction.resourceURL.lastIndexOf("/") + 1
      );


      //for sms send
      const isPackAutorenewal = packageId === 1 ||
        packageId === 4 || packageId === 5 ||
        (packageId === 2 && resultSearchPaymentLog[0].renewal);

      const isPromocodeApplied = resultSearchPaymentLog[0].promo_code !== "" && resultSearchPaymentLog[0].promo_code !== null;
      // end sms send


      const queryUpdateTransaction = `
        UPDATE gp_payments
        SET customer_reference = ?,
          consent_id = ?,
          transaction_status = 'Successful',
          transaction_id = ?,
          reference_code = ?,
          server_reference_code = ?,
          next_renew_time = ?,
          charge_request_payload = ?,
          charge_response_body = ?
        WHERE payment_id = ?
      `;

      const queryUpdateUser = `
        UPDATE users
        SET is_subscribed = ?,
          subscription_id = ?,
          payment_method = ?,
          package_id = ?,
          purchase_time = ?,
          next_purchase_time = ?,
          canceled_subscription = ?
        WHERE id = ?
      `;


      let messageFormat;
      if (packageId === 1 || packageId === 4 || isPackAutorenewal || packageId === 5) {
        messageFormat = `কাব্যিক অডিওবুক সার্ভিসটি চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+(15% ভ্যাট) ${packageId === 4 ? `দৈনিক` : `প্রতি ${numberOfDaysToAdd} দিন`
          }। বন্ধ করতে ক্লিক: https://kabbik.com/profile। যে কোন সহায়তায়: 01915225026 (চার্জ প্রযোজ্য)`;
      } else {
        messageFormat = `কাব্যিক অডিওবুক সার্ভিসটি ${numberOfDaysToAdd} দিনের জন্য চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+15% VAT। সার্ভিসটি উপভোগ করতে ক্লিক: https://kabbik.com`;
      }

      const promises=[
        DB.query(queryUpdateTransaction, [
          customerReference,
          consentId,
          transactionId,
          paymentResult.amountTransaction?.referenceCode,
          paymentResult.amountTransaction?.serverReferenceCode,
          nextPaymentDateTime,
          JSON.stringify(chargePayload),
          JSON.stringify(paymentResult),
          paymentId,
        ])
      ]
      
      if(category?.length){
        const storeLogUpdateQuery = `UPDATE store_log SET is_succeed = ?, transaction_status = ?, status_message = ?  WHERE payment_id = ?`;

        if(type.toLowerCase() === 'category'){
          const findCategory = `SELECT * from categories where id = ? LIMIT 1;`;

          const resCat = await DB.query(findCategory, [
              resultStoreLog[0]?.product_id
          ]);


          messageFormat = `কাব্যিক  সার্ভিসটি ${resCat[0].rent_duration_day || 60} দিনের জন্য চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+15% VAT। সার্ভিসটি উপভোগ করতে ক্লিক: https://kabbik.com`;

          const insertCategory = `INSERT INTO purchased_category (user_id, category_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
          
          promises.push(
              await DB.query(insertCategory, [
              resultSearchPaymentLog[0].user_id,
              resultStoreLog[0]?.product_id,
              paymentId,
              resCat[0].rent_duration_day || 60
            ])
          )
        }else if(type.toLowerCase() === 'audiobook'){
          const findBook = `SELECT rent_duration_in_day from audiobooks where id = ? LIMIT 1;`;

          const resBook = await DB.query(findBook, [
              resultStoreLog[0]?.product_id
          ]);

          messageFormat = `কাব্যিক  সার্ভিসটি ${resBook[0].rent_duration_in_day || 60} দিনের জন্য চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+15% VAT। সার্ভিসটি উপভোগ করতে ক্লিক: https://kabbik.com`;

          const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, payment_id, is_purchased, expired_at) VALUES (?,?,?,1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`;
          
          promises.push(
              await DB.query(insertQuery, [
              resultSearchPaymentLog[0].user_id,
              resultStoreLog[0]?.product_id,
              paymentId,
              resBook[0].rent_duration_in_day || 60
            ])
          )
        }
        // const findCategory = `SELECT * from categories where id = ? LIMIT 1;`;
        
        
         promises.push(
          await DB.query(storeLogUpdateQuery, [
              1,
              "Completed",
              "SUCCEEDED",
              paymentId,
          ])
         )
      }else{
        promises.push(
            DB.query(queryUpdateUser, [
            1,
            customerReference,
            resultSearchPaymentLog[0].renewal ? "GPDCB_SUBS" : "GPDCB_ONETIME",
            packageId,
            currentDateTime,
            nextPaymentDateTime,
            0,
            resultSearchPaymentLog[0].user_id,
          ]),
        )
      }

      await Promise.all([
        
        ...promises,
        this.sendSubscriptionSMS(GP_ACCESS_TOKEN, customerReference, messageFormat)
      ]);


      try {
        const findUsersSql = `SELECT * from users where id = ?`;
        const findUsers = await DB.query(findUsersSql, [
          resultSearchPaymentLog[0].user_id
        ]);

        await PaymentHelper.insertUserPaymentLog(
          resultSearchPaymentLog[0].user_id,
          findUsers[0].user_name,
          findUsers[0].full_name,
          packageId,
          "GP",
          "Subscription",
          1,
          resultSearchPaymentLog[0].renewal,
          "SUCCEEDED_PAYMENT",
          1,
          resultSearchPaymentLog[0].msisdn,
          customerReference,
          resultSearchPaymentLog[0].amount,
          resultSearchPaymentLog[0].promo_code,
          0,
          nextPaymentDateTime
        );

      } catch (e) {
        console.log("Errrrrrrrrrrrrrror", e)
      }

      
      this.giveAccessToQuiz(resultSearchPaymentLog)

      return { success: true, message: "Payment successful" };
    } catch (err) {
      console.log(err)
      throw err;
    }
  };

  rechargeAndbuySuccessful = async (req) => {
    let customerReference;
    try {
      const paymentId = req.query.paymentId;
            
      const querySearchPaymentLog = `
        SELECT * FROM gp_payments
        WHERE payment_id = ?
      `;
      const resultSearchPaymentLog = await DB.query(querySearchPaymentLog, [
        paymentId,
      ]);

      const packageId = resultSearchPaymentLog[0].package_id;
      customerReference = resultSearchPaymentLog[0].customer_reference;


      const numberOfDaysToAdd =
        packageId === 4
          ? 1
          : packageId === 1
            ? 30
            : packageId === 2
              ? 180
              : 365;

      var someDate = new Date();
      someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
      someDate.setHours(23, 29, 0, 0);
      var nextPaymentDateTime = someDate.getTime();
      const now = new Date();
      const currentDateTime = now.valueOf();


      //for sms send
      const isPackAutorenewal = packageId === 1 ||
        packageId === 4 || packageId === 5 ||
        (packageId === 2 && resultSearchPaymentLog[0].renewal);

      const isPromocodeApplied = resultSearchPaymentLog[0].promo_code !== "" && resultSearchPaymentLog[0].promo_code !== null;
      // end sms send

      let messageFormat;

      if (packageId === 1 || packageId === 4 || isPackAutorenewal || packageId === 5) {
        messageFormat = `কাব্যিক অডিওবুক সার্ভিসটি চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+(15% ভ্যাট) ${packageId === 4 ? `দৈনিক` : `প্রতি ${numberOfDaysToAdd} দিন`
          }। বন্ধ করতে ক্লিক: https://kabbik.com/profile। যে কোন সহায়তায়: 01915225026 (চার্জ প্রযোজ্য)`;
      } else {
        messageFormat = `কাব্যিক অডিওবুক সার্ভিসটি ${numberOfDaysToAdd} দিনের জন্য চালু হয়েছে। চার্জ ${resultSearchPaymentLog[0].amount} টাকা+15% VAT। সার্ভিসটি উপভোগ করতে ক্লিক: https://kabbik.com`;
      }


      const queryUpdateTransaction = `
        UPDATE gp_payments
        SET from_recharge_subscription = 1,
        transaction_status = 'Successful',
          next_renew_time = ?
        WHERE payment_id = ?
      `;

      const queryUpdateUser = `
        UPDATE users
        SET is_subscribed = ?,
          subscription_id = ?,
          payment_method = ?,
          package_id = ?,
          purchase_time = ?,
          next_purchase_time = ?,
          canceled_subscription = ?
        WHERE id = ?
      `;

      const GP_ACCESS_TOKEN = await this.getAccessToken();

      await Promise.all([
        DB.query(queryUpdateTransaction, [
          nextPaymentDateTime,
          paymentId,
        ]),

        DB.query(queryUpdateUser, [
          1,
          customerReference,
          resultSearchPaymentLog[0].renewal ? "GPDCB_SUBS" : "GPDCB_ONETIME",
          packageId,
          currentDateTime,
          nextPaymentDateTime,
          0,
          resultSearchPaymentLog[0].user_id,
        ]),

        this.sendSubscriptionSMS(GP_ACCESS_TOKEN, customerReference, messageFormat)
      ]);



      const findUsersSql = `SELECT * from users where id = ?`;
      const findUsers = await DB.query(findUsersSql, [
        resultSearchPaymentLog[0].user_id
      ]);

      PaymentHelper.insertUserPaymentLog(
        resultSearchPaymentLog[0].user_id,
        findUsers[0].user_name,
        findUsers[0].full_name,
        packageId,
        "GP",
        "Subscription",
        1,
        resultSearchPaymentLog[0].renewal,
        "SUCCEEDED_PAYMENT",
        1,
        resultSearchPaymentLog[0].msisdn,
        customerReference,
        resultSearchPaymentLog[0].amount,
        resultSearchPaymentLog[0].promo_code,
        0,
        nextPaymentDateTime
      );

    } catch (e) { }

    const redirectURL = `https://kabbik.com/payment-status?message=Payment Successful&reference=${customerReference}&status=SUCCEEDED`;
    return {
      success: true,
      redirectURL: redirectURL
    }
  }

  sendSubscriptionSMS = async (authToken, customerReference, message) => {
    try {




      // const messageFormat = `কাব্যিক অডিওবুক ${packageId === 4
      //   ? "ডেইলি"
      //   : packageId === 1
      //     ? "মাসিক"
      //     : packageId === 2 && !isPackAutorenewal
      //       ? "হাফ-ইয়ারলি (নন অটো রিনিউয়াল)"
      //       : packageId === 2 && isPackAutorenewal
      //         ? "হাফ-ইয়ারলি"
      //         : packageId === 5 ? "ইয়ারলি" : "ইয়ারলি (নন অটো রিনিউয়াল)"
      //   } সাবস্ক্রিপশন সফলভাবে চালু হয়েছে${isPromocodeApplied ? "(ডিসকাউন্ট অফার প্রাইসে)" : ""
      //   }। ${isPackAutorenewal
      //     ? `${packageId === 4
      //       ? "প্রতিদিন Tk. 4.04"
      //       : packageId === 1
      //         ? "প্রতিমাস Tk. 50.50"
      //         : packageId === 2
      //           ? "প্রতিছয় মাস Tk. 252.50" : "প্রতিবছর Tk. 454.50"
      //     } চার্জ প্রযোজ্য (নবায়নযোগ্য)। পরবর্তী নবায়নের তারিখ: ${moment(
      //       nextPaymentDateTime
      //     ).format("DD/MM/YYYY")}।`
      //     : `চার্জ হয়েছে Tk. ${(resultSearchPaymentLog[0].amount * 1.15).toFixed(2)}।`
      //   } অডিওবুক শুনতে ভিজিট করুন https://kabbik.com অথবা ডাউনলোড অ্যাপ https://kabbik.com/download-app এছাড়াও Play Store বা Apple Store-এ Kabbik Audiobook লিখে সার্চ দিলেই অ্যাপটি পাওয়া যাবে।${isPackAutorenewal ? "সাবস্ক্রিপশন বন্ধ করতে https://kabbik.com/profile" : ""} হেল্পলাইন: ০১৯১৫২২৫০২৬`;

      var formatedMessage = message.replace(/[\n\r]+/g, ' ')      // Remove all line breaks
        .replace(/\s{2,}/g, ' ')       // Replace multiple spaces with single space
        .trim();
      const payloadSendSMS = {
        outboundSMSMessageRequest: {
          address: `acr:${customerReference}`,
          senderName: "Kabbik",
          senderAddress: "tel:+8801915225026",
          outboundSMSTextMessage: {
            message: formatedMessage,
          },
          messageType: "ARN",
        },
      };
      await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/smsmessaging/v2/outbound/tel:+8801915225026/requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadSendSMS),
        }
      );
      return true;
    } catch (e) {
      console.log("Heeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeelo", e.message)
      return false;
    }
  }



  rechargeAndbuy = async (customerReference, failedReferenceCode, paymentId, authToken) => {

    const rechargePayload = {
      originalReferenceCode: failedReferenceCode,
      referenceCode: `REF-${makeSubscriptionId(20)}`,
      urls: {
        ok: `${KABBIK_BACKEND_API}/v4/gp/redirect-url-recharge/ok?paymentId=${paymentId}&fromRecharge=true`,
        deny: `${KABBIK_BACKEND_API}/api/v4/gp/redirect-url/deny?paymentId=${paymentId}&fromRecharge=true`,
        error: `${KABBIK_BACKEND_API}/api/v4/gp/redirect-url/error?paymentId=${paymentId}&fromRecharge=true`,
      },
    }

    try {
      
      const url = `${GP_DCB_PRODUCTION_URL}/partner/payment/v1/${customerReference}/transactions/recharge/prepare`;

      
      const rechargeResponse = await fetch(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rechargePayload),
        }
      );

      
      const finalRes = await rechargeResponse.json();

      
      return {
        success: true,
        requestPayload: rechargePayload,
        response: finalRes
      }
    } catch (e) {
      console.log("Errrrrrrrrrrrrrrrrrrrrrrrrrrror in rechagr and buy api", e)
      return {
        success: false,
        requestPayload: rechargePayload,
        response: {
          success: false,
          message: `Failed to proceed recharge ${e.message || ""}`
        }
      };

    }
  }



  denyPayment = async (req) => {
    const message = req.query.fromRecharge ? "Recharge request cancelled" : "Otp Verification Cancelled";
    const redirectURL = `https://kabbik.com/payment-status?message=${message}&status=FAILED`;
    try {
      const queryUpdateTransaction = `
        UPDATE gp_payments
        SET transaction_status = 'Denied',
        error_message = ?
        WHERE payment_id = ?
      `;
      await DB.query(queryUpdateTransaction, [
        message,
        req.query.paymentId,
      ]);
    } catch (err) {
      console.log("ERRRRRRRRRRRRRRRRor", err.message)
    }

    return {
      success: true,
      redirectURL: redirectURL
    }

  };

  errorPayment = async (req) => {
    const message = req.query.fromRecharge ? "Recharge request failed" : "Otp verification failed";
    const redirectURL = `https://kabbik.com/payment-status?message=${message}&status=FAILED`;
    try {
      const queryUpdateTransaction = `
        UPDATE gp_payments
        SET transaction_status = 'Error',
        error_message = ?
        WHERE payment_id = ?
      `;
      await DB.query(queryUpdateTransaction, [
        message,
        req.query.paymentId,
      ]);
    } catch (err) { }

    return {
      success: true,
      redirectURL: redirectURL
    }

  };

  refundPayment = async (req) => {
    try {
      const paymentRecordQuery = `
        SELECT * FROM gp_payments
        WHERE transaction_id = ?
      `;
      const paymentRecordResult = await DB.query(paymentRecordQuery, [
        req.body.transactionId,
      ]);
      if (paymentRecordResult.length === 0) {
        return { success: false, message: "Payment record not found" };
      }
      if (paymentRecordResult[0].refunded === 1) {
        return { success: false, message: "Payment already refunded" };
      }
      const GP_ACCESS_TOKEN = await this.getAccessToken();
      const packageId = paymentRecordResult[0].package_id;
      const packageName =
        packageId === 4
          ? "Daily"
          : packageId === 1
            ? "Monthly"
            : packageId === 2
              ? "Half Yearly"
              : "Yearly";
      const refundPayload = {
        amountTransaction: {
          endUserId: paymentRecordResult[0].customer_reference,
          paymentAmount: {
            chargingInformation: {
              amount: paymentRecordResult[0].amount,
              currency: "BDT",
              description: `Kabbik - ${packageName} Subscription`,
            },
          },
          originalServerReferenceCode: "t" + req.body.transactionId,
          referenceCode: `REF-${makeSubscriptionId(20)}`,
          transactionOperationStatus: "Refunded",
        },
      };
      const refundResponse = await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/payment/v1/${paymentRecordResult[0].customer_reference}/transactions/amount`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(refundPayload),
        }
      );
      if (refundResponse.status !== 201) {
        const error = await refundResponse.json();
        if (error.requestError.policyException?.messageId === "POL0001") {
          throw new Error("Invalid PIN or Expired ACR");
        }
        throw new Error("Failed to refund payment");
      }
      const updatePaymentRecordQuery = `
        UPDATE gp_payments
        SET refunded = 1
        WHERE transaction_id = ?
      `;
      const updatePaymentRecordResult = await DB.query(
        updatePaymentRecordQuery,
        [req.body.transactionId]
      );
      const refundResult = await refundResponse.json();
      return { success: true, message: "Refund successful" };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  unsubscribe = async (req) => {
    try {
      const searchUserQuery = `SELECT * FROM gp_payments 
      WHERE user_id = ? AND transaction_status = 'Successful'
      AND cancelled_subscription != 1 ORDER BY id DESC`;

      const searchUserResult = await DB.query(searchUserQuery, [
        req.query.userId,
      ]);
      if (searchUserResult.length === 0) {
        throw new Error("User not found");
      }
      const GP_ACCESS_TOKEN = await this.getAccessToken();

      const messageFormat = `কাব্যিক অডিওবুক সার্ভিসটি বন্ধ হয়েছে।পুনরায় চালু করতে ক্লিক https://kabbik.com/subscribe`;

      const payloadSendSMS = {
        outboundSMSMessageRequest: {
          address: `acr:${searchUserResult[0].customer_reference}`,
          senderName: "Kabbik",
          senderAddress: "tel:+8801915225026",
          outboundSMSTextMessage: {
            message: messageFormat,
          },
          messageType: "ARN",
        },
      };
      const sendSMSResponse = await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/smsmessaging/v2/outbound/tel:+8801915225026/requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadSendSMS),
        }
      );
      const invalidateACRResponse = await fetch(
        `${GP_DCB_PRODUCTION_URL}/partner/acrs/${searchUserResult[0].customer_reference}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
          },
        }
      );
      if (invalidateACRResponse.status !== 204) {
        throw new Error("Failed to invalidate ACR");
      }
      const updateUserQuery = `
        UPDATE users
        SET canceled_subscription = 1
        WHERE id = ?
      `;
      const updatePaymentTable = `
        UPDATE gp_payments
        SET cancelled_subscription = 1,
        cancelled_at = CURRENT_TIMESTAMP()
        WHERE id = ?
      `;

      await DB.query(updatePaymentTable, [
        searchUserResult[0].id,
      ]);

      await DB.query(updateUserQuery, [
        req.query.userId,
      ]);

      return { success: true, message: "Unsubscribed successfully" };
    } catch (err) {
      throw err;
    }
  };

  unsubscribeCallback = async (req) => {
    const deactivatedSubscriptions = req.body?.deactivatedSubscriptions || [];

    for (const entry of deactivatedSubscriptions) {
      try {
        const { acr, subscription } = entry;

        if (!acr || !subscription) continue;

        const searchPaymentQuery = `SELECT * FROM gp_payments
          WHERE customer_reference = ? 
          AND transaction_status = 'Successful' AND cancelled_subscription != 1
          ORDER BY id DESC`;

        const searchPaymentResult = await DB.query(searchPaymentQuery, [
          acr,
          subscription,
        ]);


        if (searchPaymentResult.length === 0) continue;

        const updatePaymentTable = `
          UPDATE gp_payments
          SET cancelled_subscription = 1,
          cancelled_at = CURRENT_TIMESTAMP()
          WHERE id = ?
        `;
        const updateUserQuery = `
          UPDATE users
          SET canceled_subscription = 1
          WHERE id = ?
        `;

        await DB.query(updatePaymentTable, [searchPaymentResult[0].id]);
        await DB.query(updateUserQuery, [searchPaymentResult[0].user_id]);
      } catch (err) {
        console.error("[GP unsubscribeCallback]", err);
      }
    }

    return { success: true, message: "Processed" };
  };

  renewalCharge = async () => {
    const dbg = (msg) => console.log(`[GP renewalCharge] ${msg}`);
    try {
      dbg("START");

      const subscriptionExpiredUsersQuery = ` SELECT gp.*, sp.rawPrice FROM gp_payments AS gp JOIN 
		   subscription_packages as sp on sp.subscriptionItemId = gp.package_id WHERE gp.transaction_status = 'Successful'
		   AND gp.renewal = 1 
			AND gp.cancelled_subscription != 1
			AND gp.first_payment = 1  AND next_renew_time < ?`;



      var currentDateTime = Date.now();


      const subscriptionExpiredUsersResult = await DB.query(
        subscriptionExpiredUsersQuery,
        [
          currentDateTime
        ]
      );
      dbg(`expiredUsers=${subscriptionExpiredUsersResult.length} cutoffMs=${currentDateTime}`);

      let count = 0;
      for (const user of subscriptionExpiredUsersResult) {
        try {
          dbg(`loop userId=${user.user_id} gpPayId=${user.id} pkg=${user.package_id} msisdn=${user.msisdn}`);

          const GP_ACCESS_TOKEN = await this.getAccessToken();
          const packageName =
            user.package_id === 4
              ? "Daily"
              : user.package_id === 1
                ? "Monthly"
                : user.package_id === 2
                  ? "Half Yearly"
                  : "Yearly";

          const numberOfDaysToAdd =
            user.package_id === 4
              ? 1
              : user.package_id === 1
                ? 30
                : user.package_id === 2
                  ? 180
                  : 365;


          var someDate = new Date();
          someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
          someDate.setHours(23, 29, 0, 0);
          var nextPaymentDateTime = someDate.getTime();

          let amount = Number(((user.rawPrice * 1.01) / 1.15).toFixed(2));
          if(user.package_id == 4  && user.amount==3.51){
            amount = 3.51;
          }
          // const amount = user.amount;
          dbg(`chargePrep userId=${user.user_id} amount=${amount} nextRenew=${nextPaymentDateTime} days=${numberOfDaysToAdd}`);

          const chargePayload = {
            amountTransaction: {
              endUserId: user.customer_reference,
              transactionOperationStatus: "Charged",
              referenceCode: `REF-${makeSubscriptionId(20)}`,
              paymentAmount: {
                chargingInformation: {
                  amount,
                  description: [`Kabbik - ${packageName} Subscription`],
                  currency: "BDT",
                },
                chargingMetaData: {
                  productId: "Kabbik",
                  mandateId: {
                    consentId: user.consent_id,
                    subscription: user.subscription_id,
                    subscriptionPeriod:
                      user.package_id === 4
                        ? "P1D"
                        : user.package_id === 1
                          ? "P1M"
                          : user.package_id === 2
                            ? "P6M"
                            : "P1Y",
                  },
                },
              },
            },
          };
          dbg(`chargeApiCall userId=${user.user_id} custRef=${user.customer_reference}`);

          const chargeResponse = await fetch(
            `${GP_DCB_PRODUCTION_URL}/partner/payment/v1/${user.customer_reference}/transactions/amount`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(chargePayload),
            }
          );

          let transactionStatus = "Error",
            transactionId = "",
            referenceCode = "",
            serverReferenceCode = "",
            responseBody = null;
          if (chargeResponse.status === 201) {

            if (user.package_id !== 4) {
              const successFulRenewMessage = `কাব্যিক অডিওবুক সার্ভিসটি ${numberOfDaysToAdd} দিন এর জন্য অটো রিনিউ হয়েছে। চার্জ ${amount}/টাকা +15% ভ্যাট। অটো রিনিউ বন্ধ করতে ভিজিট: https://kabbik.com/profile`;
              this.sendSubscriptionSMS(GP_ACCESS_TOKEN, user.customer_reference, successFulRenewMessage);
            }

            const updateGpPayment = `UPDATE gp_payments
            SET renew_at = CURRENT_TIMESTAMP(),
                next_renew_time = ?
            WHERE id = ?`;

            await DB.query(updateGpPayment, [
              nextPaymentDateTime,
              user.id
            ]);
            const paymentResult = await chargeResponse.json();
            transactionStatus = "Successful";
            transactionId = paymentResult.amountTransaction.resourceURL.slice(
              paymentResult.amountTransaction.resourceURL.lastIndexOf("/") + 1
            );
            referenceCode = paymentResult.amountTransaction.referenceCode;
            serverReferenceCode =
              paymentResult.amountTransaction.serverReferenceCode;
            responseBody = JSON.stringify(paymentResult);

            dbg(`chargeOk userId=${user.user_id} txnId=${transactionId} ref=${referenceCode}`);

            try {
              const findUsersSql = `SELECT * from users where id = ?`;
              const findUsers = await DB.query(findUsersSql, [
                user.user_id
              ]);

              PaymentHelper.insertUserPaymentLog(
                user.user_id,
                findUsers[0].user_name,
                findUsers[0].full_name,
                user.package_id,
                "GP",
                "Subscription",
                0,
                1,
                "SUCCEEDED_PAYMENT",
                1,
                user.msisdn,
                user.customer_reference,
                amount,
                null,
                0,
                nextPaymentDateTime
              );

            } catch (e) {
              dbg(`paymentLogErr userId=${user.user_id} err=${e?.message || "unknown"}`);
            }

          }


          else {
            transactionStatus = chargeResponse.statusText || "";
            serverReferenceCode = chargeResponse.status || "";
            responseBody = JSON.stringify(chargeResponse);
            dbg(`chargeFail userId=${user.user_id} status=${chargeResponse.status} reason=${transactionStatus}`);
          }


          const queryInsertTransaction = `
            INSERT INTO gp_payment_log (
              user_id,
              msisdn,
              subscription_id,
              payment_id,
              package_id,
              amount,
              transaction_status,
              reference_code,
              server_reference_code,
              response_body 
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;
          await DB.query(
            queryInsertTransaction,
            [
              user.user_id,
              user.msisdn,
              makeSubscriptionId(20),
              transactionId,
              user.package_id,
              amount,
              transactionStatus,
              referenceCode,
              serverReferenceCode,
              responseBody,
            ]
          );
          dbg(`logInserted userId=${user.user_id} status=${transactionStatus}`);
          if (chargeResponse.status !== 201) {
            const error = await chargeResponse.json();
            if (error.requestError.policyException?.messageId === "POL0001") {
              dbg(`POL0001 skip userId=${user.user_id}`);
                          }
                        continue;
          }
          dbg(`updateUser userId=${user.user_id} nextPurchase=${nextPaymentDateTime}`);
          this?.giveAccessToQuiz(subscriptionExpiredUsersResult,true)
          if (subscriptionExpiredUsersResult[0].promo_code === "QUIZ26WORLDCUP" || subscriptionExpiredUsersResult[0].promo_code === "QUIZ26WORLDCUPNEXT") {
            const now = new Date();
            const deadline = new Date("2026-07-17T23:59:59");

            if (now < deadline) {
              return {
                totalSubscriptionExpiredUsers: subscriptionExpiredUsersResult.length,
                successfullySubscribedUsers: count,
              };
            }
            
          }
          const queryUpdateUser = `
            UPDATE users
            SET is_subscribed = ?,
              payment_method = ?,
              package_id = ?, 
              next_purchase_time = ?,
              canceled_subscription = ?
            WHERE id = ?
          `;


          await DB.query(queryUpdateUser, [
            1,
            "GPDCB_SUBS",
            user.package_id,
            nextPaymentDateTime,
            0,
            user.user_id,
          ]);
          count = count + (transactionStatus === "Successful");
          dbg(`loopDone userId=${user.user_id} ok=${transactionStatus === "Successful"} count=${count}`);
        } catch (err) {
          console.error(`[GP renewalCharge] loopErr userId=${user?.user_id} err=${err?.message || "unknown"}`);
        }
      }
      dbg(`DONE total=${subscriptionExpiredUsersResult.length} success=${count}`);
      return {
        totalSubscriptionExpiredUsers: subscriptionExpiredUsersResult.length,
        successfullySubscribedUsers: count,
      };
    } catch (err) {
      console.error(`[GP renewalCharge] FATAL err=${err?.message || "unknown"}`);
      throw err;
    }
  };

  renewalWarning = async () => {
    try {
      const subscriptionWarningUsersQuery = `
        SELECT u.*, sp.rawPrice
        FROM users u
        JOIN subscription_packages sp
        ON u.package_id = sp.subscriptionItemId
        WHERE u.payment_method = 'GPDCB_SUBS'
          AND u.canceled_subscription = 0
          AND DATE(FROM_UNIXTIME(next_purchase_time / 1000)) = DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
      `;
      const subscriptionWarningUsersResult = await DB.query(
        subscriptionWarningUsersQuery
      );
      let count = 0;
      for await (const user of subscriptionWarningUsersResult) {
        try {
          if (
            !(
              user.package_id === 5 || user.package_id === 1 || (user.package_id === 2 && user.payment_method === "GPDCB_SUBS")
            )
          )
            continue;
          const GP_ACCESS_TOKEN = await this.getAccessToken();

          const messageFormat = `আগামী ${moment(user.next_purchase_time).format(
            "YYYY-MM-DD HH:mm:ss"
          )} তারিখে কাব্যিক অডিওবুক সার্ভিসটি অটো রিনিউ হবে। সার্ভিসটি চালু রাখতে মোবাইল এ ${amount} টাকা + 15% VAT ব্যালেন্স রাখুন। অটো রিনিউ বন্ধ করতে ক্লিক: https://kabbik.com/profile`;

          const payloadSendSMS = {
            outboundSMSMessageRequest: {
              address: `acr:${user.subscription_id}`,
              senderName: "Kabbik",
              senderAddress: "tel:+8801915225026",
              outboundSMSTextMessage: {
                message: messageFormat,
              },
              messageType: "ARN",
            },
          };
          const sendSMSResponse = await fetch(
            `${GP_DCB_PRODUCTION_URL}/partner/smsmessaging/v2/outbound/tel:+8801915225026/requests`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payloadSendSMS),
            }
          );
          if (sendSMSResponse.status === 201) {
            count++;
          }
        } catch (err) {
          console.error(err);
        }
      }
      return {
        totalSubscriptionWarnedUsers: subscriptionWarningUsersResult.length,
        successfullySubscriptionWarnedUsers: count,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
}

function toBanglaNumber(number) {
  const englishToBangla = {
    0: "০",
    1: "১",
    2: "২",
    3: "৩",
    4: "৪",
    5: "৫",
    6: "৬",
    7: "৭",
    8: "৮",
    9: "৯",
  };
  return number
    .toString()
    .split("")
    .map((digit) => englishToBangla[digit] || digit)
    .join("");
}

module.exports = new GpModel();
