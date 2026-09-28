const DB = require("../db");
const BkashModel = require("../models/bkash-model");
const coreUtils = require("../../utils/core-utils");
const LoggerError = require("../../utils/logger-error");
const { multipleColumnSet } = require("../../utils/core-utils");
const crypto = require("crypto");
class UserModelV4 {
  tableName = "users";

  updateUserFirstLogin = async (req) => {
    try {
      let sql;
      let result;
      // if (req.query.full_name) {
      sql =
        "UPDATE users SET phone_no = ?,  full_name = ?, user_email = ? WHERE id = ?";

      result = await DB.query(sql, [
        req.body.phone_no,
        req.body.full_name,
        req.body.user_email,
        req.query.user_id,
      ]);
      // } else {
      //     sql = 'UPDATE users SET phone_no = ? WHERE id = ?';

      //     result = await DB.query(sql, [req.query.phone_no, req.query.user_id]);
      // }

      if (result) {
        return true;
      }
      return false;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };
  requestAudiobook = async (req) => {
    try {
      let sql;
      let result;
      // if (req.query.full_name) {
      sql =
        "UPDATE request_audiobbok SET phone_no = ?,  full_name = ?, user_email = ? WHERE id = ?";

      result = await DB.query(sql, [
        req.body.phone_no,
        req.body.full_name,
        req.body.user_email,
        req.query.user_id,
      ]);
      // } else {
      //     sql = 'UPDATE users SET phone_no = ? WHERE id = ?';

      //     result = await DB.query(sql, [req.query.phone_no, req.query.user_id]);
      // }

      if (result) {
        return true;
      }
      return false;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  redeem = async (req) => {
    try {
      let sqlCode, sql;
      let resultCode, result; 
      let generatedRes;

      sqlCode = "SELECT * from redeem where code = ? AND isActive = 1";

      resultCode = await DB.query(sqlCode, [req.body.code]);


      if (resultCode) {
        if (resultCode.length > 0) {

          if (resultCode[0].generated_source == 'user_claim') {
            const findClaimSql = `SELECT * from tier_user_reward_claim_log where id = ?`;
             generatedRes = await DB.query(findClaimSql, [resultCode[0].generated_source_id]);

            const expireAt = new Date(generatedRes[0].expire_at); // parsed date
            const now = new Date(); // current timestamp
            const isExpired = expireAt < now;

            if (isExpired) {
              await DB.query(`UPDATE redeem SET isActive = 0 WHERE id = ${resultCode[0].id}`);
            }
            if (isExpired || generatedRes[0].user_id != req.body.userId) {
              return "Invalid";
            }

          }
        
          sql = "UPDATE redeem SET usedBy = ?, usedDate = ?, isActive = ? WHERE id = ?";

          result = await DB.query(sql, [
            req.body.userId,
            Date.now(),
            0,
            resultCode[0].id,
          ]);

          if (result) {
            var someDate = new Date();
            var numberOfDaysToAdd = 6;
            if (resultCode[0].package != null && resultCode[0].package == 1) {
              numberOfDaysToAdd = 30;
            }
            if (resultCode[0].package != null && resultCode[0].package == 2) {
              numberOfDaysToAdd = 180;
            }
            if (resultCode[0].package != null && resultCode[0].package == 3) {
              numberOfDaysToAdd = 365;
            }
            var result444 = someDate.setDate(
              someDate.getDate() + numberOfDaysToAdd
            );
            var currentDateTime = new Date().valueOf();
            var nextPaymentDateTime = result444;
            var method = "RedeemCode";
            const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

             await DB.query(sqlUpdateUser, [
              true,
              req.body.code,
              method,
              resultCode[0].package,
              currentDateTime,
              nextPaymentDateTime,
              0,
              req.body.userId,
            ]);

            let user_ip;

            if (req.headers["x-forwarded-for"]) {
              user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
            } else {
              user_ip = "N/A";
            }

            sql = `INSERT INTO redeem_log(code, userId, Ip_address, host, user_agent)
                    VALUES(?, ?, ?,?,?);`;
            result = await DB.query(sql, [
              req.body.code,
              req.body.userId,
              user_ip,
              req.headers["host"],
              req.headers["user-agent"],
            ]);

            if(resultCode[0]?.generated_source == 'user_claim'){
             await DB.query(`UPDATE tier_user_reward_claim_log SET is_used = 1 WHERE id = ${generatedRes[0].id}`);
            }
          
            return "Redeem Code Applied";
          }
        }
      }

      return "Invalid";
    } catch (e) {
      LoggerError.log(e);
      return false;
    }
  };

  calculateUserEarnings = async () => {
    try {
      const earningQuery = `INSERT INTO refer_reports (user_id, earnings, refer_code, created_at, withdraw)
SELECT combined_data.id, SUM(total_amount) AS total_earnings, refer_code, created_date, SUM(withdraw_amount)
FROM (
    
    SELECT usr.id, SUM(5) AS total_amount, bi.promoCode AS refer_code, bi.created_at AS created_date, 0 AS withdraw_amount
    FROM bkash_webhook AS bw
    JOIN bkash_invoice AS bi ON bw.subscriptionRequestId = bi.subscriptionRequestId
    JOIN users AS usr ON usr.refer_code = bi.promoCode
                      AND usr.id != bi.userId
    WHERE bw.paymentStatus = 'SUCCEEDED_PAYMENT' AND bw.firstPayment = 1
    AND DATE(CONVERT_TZ(bw.created_at, 'UTC', 'Asia/Dhaka')) = DATE(CONVERT_TZ(bi.created_at, 'UTC', 'Asia/Dhaka'))
    AND DATE(CONVERT_TZ(bw.created_at, 'UTC', 'Asia/Dhaka')) 
        BETWEEN DATE_FORMAT(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH), '%Y-%m-01')
        AND LAST_DAY(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH))
    GROUP BY usr.id

    UNION ALL
    
   SELECT usr.id, SUM(5) AS total_amount, np.promo_code AS refer_code, np.created_at AS created_date, 0 AS withdraw_amount
    FROM nagad_payment AS np
    JOIN users AS usr ON usr.refer_code = np.promo_code
                     AND usr.id != np.userId AND np.status = 'Success'
    WHERE DATE(CONVERT_TZ(np.created_at, 'UTC', 'Asia/Dhaka')) 
        BETWEEN DATE_FORMAT(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH), '%Y-%m-01')
        AND LAST_DAY(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH))
    GROUP BY usr.id
    
    UNION ALL

   SELECT usr.id, SUM(5) AS total_amount, rp.promo_code AS refer_code, rp.created_at AS created_date, 0 AS withdraw_amount
    FROM robi_payment AS rp
    JOIN users AS usr ON usr.refer_code = rp.promo_code
                     AND usr.id != rp.userId AND rp.status = 'SUCCEEDED'
    WHERE DATE(CONVERT_TZ(rp.created_at, 'UTC', 'Asia/Dhaka')) 
        BETWEEN DATE_FORMAT(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH), '%Y-%m-01')
        AND LAST_DAY(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH))
    GROUP BY usr.id
    
    
     UNION ALL

   SELECT usr.id, SUM(5) AS total_amount, bo.promo_code AS refer_code, bo.created_at AS created_date, 0 AS withdraw_amount
    FROM bkash_onetime AS bo
    JOIN users AS usr ON usr.refer_code = bo.promo_code
                     AND usr.id != bo.userId AND bo.executeStatusMessage = 'Successful'
    WHERE DATE(CONVERT_TZ(bo.created_at, 'UTC', 'Asia/Dhaka')) 
        BETWEEN DATE_FORMAT(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH), '%Y-%m-01')
        AND LAST_DAY(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH))
    GROUP BY usr.id
    
    
     UNION ALL

   SELECT rfw.user_id AS id, 0 AS total_amount, rfw.refer_code AS refer_code, rfw.created_at AS created_date, SUM(rfw.amount) AS withdraw_amount FROM refer_withdraw_log AS rfw 
    WHERE DATE(CONVERT_TZ(rfw.created_at, 'UTC', 'Asia/Dhaka')) 
        BETWEEN DATE_FORMAT(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH), '%Y-%m-01')
        AND LAST_DAY(DATE_SUB(CONVERT_TZ(NOW(), 'UTC', 'Asia/Dhaka'), INTERVAL 1 MONTH))
    GROUP BY rfw.user_id
    
    
) AS combined_data
GROUP BY combined_data.id`;

      const updateUserEarnigns = `UPDATE users AS u
JOIN (
    SELECT r.user_id, SUM(r.earnings) AS total_earnings, SUM(r.withdraw) AS total_withdraw
    FROM refer_reports AS r
    GROUP BY r.user_id
) AS updates ON u.id = updates.user_id
SET u.total_earnings = updates.total_earnings,
    u.total_withdraw = updates.total_withdraw,
    u.total_payout = updates.total_earnings - updates.total_withdraw
WHERE u.total_earnings != updates.total_earnings
   OR u.total_withdraw != updates.total_withdraw;`;

      const res = await DB.query(sqlCode, [req.body.code]);
      await DB.query(updateUserEarnigns);
      return true;
    } catch (e) {
      return false;
    }
  };

  getUserEarning = async (req) => {
    try {
      const sql = `SELECT SUM(ue.earnings) AS user_earning  FROM users_earning as ue WHERE ue.user_id = ?`;
      const result = await DB.query(sql, [req.query.userId]);
      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  requestWithdraw = async (req) => {
    try {
      const searchUser = `SELECT us.id AS user_id, us.total_earnings as amount, us.refer_code AS refer_code, COALESCE(rfl.isProcessing, 0) AS is_processing FROM users as us LEFT JOIN refer_withdraw_log as rfl ON us.id = rfl.user_id WHERE us.id = ? ORDER BY rfl.created_at DESC LIMIT 1`;
      const user = await DB.query(searchUser, [req.body.userId]);

      if (!user) {
        return false;
      } else if (user[0].is_processing == 1) {
        return {
          success: false,
          message: "your request on processing",
        };
      } else if (user[0].amount < 100) {
        return {
          success: false,
          message:
            "To proceed with the withdrawal, a minimum amount of 100 is required. Please ensure your balance meets this requirement before continuing.",
        };
      }

      const insertSql = `INSERT INTO refer_withdraw_log (user_id, amount, refer_code) 
                                             VALUES (?,?,?);`;
      const result = await DB.query(insertSql, [
        user[0].user_id,
        user[0].amount,
        user[0].refer_code,
      ]);
      return {
        success: true,
        message: "Your withdrawal request has been successfully submitted.",
        data: result,
      };
    } catch (e) {
      return false;
    }
  };

  generateRand = async (req) => {
    try {
      var data = "";
      for (let i = 0; i < 2000; i++) {
        const sql = `INSERT INTO redeem (code) VALUES (?)`;
        const ra = this.makeSubscriptionId(6);
        const result = await DB.query(sql, [ra]);
      }
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  continueWatching = async (req) => {
    try {
      const { continueWatchingLogs } = req.body;

      const sqlGetUser = `Select * from continueWatchingLog where user_id = ?`;

      const resultGetUser = await DB.query(sqlGetUser, [req.query.user_id]);

      if (resultGetUser && resultGetUser.length > 0) {
        const updateSql =
          "UPDATE continueWatchingLog SET continueWatchingLogs = ? WHERE user_id = ?";
        const updateResult = await DB.query(updateSql, [
          JSON.stringify(req.body),
          req.query.user_id,
        ]);
      } else {
        const insertSql = `INSERT INTO continueWatchingLog (user_id, continueWatchingLogs) VALUES (?,?)`;
        const insertResult = await DB.query(insertSql, [
          req.query.user_id,
          JSON.stringify(req.body),
        ]);
      }
      return "success";
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  continueWatchingWeb = async (req) => {
    try {
      const { continueWatchingLogs } = req.body;

      const sqlGetUser = `Select * from continueWatchingLogWeb where user_id = ?`;

      const resultGetUser = await DB.query(sqlGetUser, [req.query.user_id]);

      if (resultGetUser && resultGetUser.length > 0) {
        const updateSql =
          "UPDATE continueWatchingLogWeb SET continueWatchingLogWebs = ? WHERE user_id = ?";
        const updateResult = await DB.query(updateSql, [
          JSON.stringify(req.body),
          req.query.user_id,
        ]);
      } else {
        const insertSql = `INSERT INTO continueWatchingLogWeb (user_id, continueWatchingLogWebs) VALUES (?,?)`;
        const insertResult = await DB.query(insertSql, [
          req.query.user_id,
          JSON.stringify(req.body),
        ]);
      }
      return "success";
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  getContinueWatching = async (req) => {
    try {
      const { user_id } = req.query;

      const sqlGetUser = `Select continueWatchingLogs from continueWatchingLog where user_id = ? limit 1`;

      const resultGetUser = await DB.query(sqlGetUser, [user_id]);
      if (resultGetUser.length < 1) {
        return {
          data: [],
        };
      }
      return JSON.parse(resultGetUser[0].continueWatchingLogs);
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  getContinueWatchingWeb = async (req) => {
    try {
      const { user_id } = req.query;

      const sqlGetUser = `Select continueWatchingLogWebs from continueWatchingLogWeb where user_id = ? limit 1`;

      const resultGetUser = await DB.query(sqlGetUser, [user_id]);

      return JSON.parse(resultGetUser[0].continueWatchingLogWebs);
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  continueWatchingAudiobookList = async (req) => {
    try {
      const { audiobooksList } = req.body;

      const sqlGetAudiobookList = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.approval_status = 1
                    AND a.deleted = FALSE
                    AND a.id in (?)
            ORDER BY play_count DESC;`;

      const resultGetAudiobookList = await DB.query(sqlGetAudiobookList, [
        audiobooksList,
      ]);
      const sortedResult = audiobooksList.map((audiobookId) => {
        return resultGetAudiobookList.find((item) => item.id === audiobookId);
      });
      return sortedResult;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };
  updateIosSubscription = async (req) => {
    const { status, amount, userId, packageId } = req.body;
    try {
      const sqlUser = `SELECT * from users WHERE id = ?`;
      var resultUser = await DB.query(sqlUser, [userId]);
      const insertSql = `INSERT INTO apple_pay
                (status, amount, userId, packageId) 
                VALUES (?,?,?, ?);`;
      const resultsInsertSql = await DB.query(insertSql, [
        status,
        amount,
        userId,
        packageId,
      ]);
      if (resultsInsertSql) {
      }
      var someDate = new Date();
      var numberOfDaysToAdd = 6;
      if (packageId != null && packageId == 1) {
        numberOfDaysToAdd = 30;
      }
      if (packageId != null && packageId == 2) {
        numberOfDaysToAdd = 180;
      }
      if (packageId != null && packageId == 3) {
        numberOfDaysToAdd = 365;
      }
      var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
      var currentDateTime = new Date().valueOf();
      var nextPaymentDateTime = result444;
      var method = "ApplePay";
      if (status == "Success") {
        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
        const resultUpdateUser = await DB.query(sqlUpdateUser, [
          true,
          packageId,
          method,
          packageId,
          currentDateTime,
          nextPaymentDateTime,
          0,
          userId,
        ]);
      } else {
        if (resultUser[0].payment_method == method) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            false,
            packageId,
            method,
            packageId,
            0,
            0,
            0,
            userId,
          ]);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  };
  updateGooglepaySubscription = async (req) => {
    const { status, amount, userId, packageId, orderId } = req.body;
    try {
      const sqlUser = `SELECT * from users WHERE id = ?`;
      var resultUser = await DB.query(sqlUser, [userId]);
      const insertSql = `INSERT INTO googlepay_invoice
                (status, amount, userId, username, packageId, orderId) 
                VALUES (?,?,?,?, ?,?);`;
      const resultsInsertSql = await DB.query(insertSql, [
        status,
        amount,
        userId,
        userId,
        packageId,
        orderId,
      ]);
      if (resultsInsertSql) {
      }
      var someDate = new Date();
      var numberOfDaysToAdd = 6;
      if (packageId != null && packageId == 1) {
        numberOfDaysToAdd = 30;
      }
      if (packageId != null && packageId == 2) {
        numberOfDaysToAdd = 180;
      }
      if (packageId != null && packageId == 3) {
        numberOfDaysToAdd = 365;
      }
      var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
      var currentDateTime = new Date().valueOf();
      var nextPaymentDateTime = result444;
      var method = "Googlepay";
      if (status == "Success") {
        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
        const resultUpdateUser = await DB.query(sqlUpdateUser, [
          true,
          packageId,
          method,
          packageId,
          currentDateTime,
          nextPaymentDateTime,
          0,
          userId,
        ]);
      } else {
        if (resultUser[0].payment_method == method) {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
          const resultUpdateUser = await DB.query(sqlUpdateUser, [
            false,
            packageId,
            method,
            packageId,
            0,
            0,
            0,
            userId,
          ]);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  };
  accountDeletionRequest = async (req) => {
    const { name, phone, email, reason } = req.body;

    try {
      const insertSql = `INSERT INTO account_deletion_request
        (name, phone, email, reason) 
        VALUES (?,?,?, ?);`;
      const resultsInsertSql = await DB.query(insertSql, [
        name,
        phone,
        email,
        reason,
      ]);
      if (resultsInsertSql) {
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  paymentMethodList = async (req) => {
    var appVersion = req.body.appVersion ? parseInt(req.body.appVersion) : 0;

    try {
      var sql;
      var result;
      if (appVersion > 93) {
        sql = `Select * from payment_methods where (deleted = 0 && active = 1 && forPackage =? && (appVersion = 0 || appVersion < ?)) order by positionNumber ASC`;

        result = await DB.query(sql, [req.body.forPackage, appVersion]);
      } else {
        sql = `Select * from payment_methods where (deleted = 0 && active = 1 && forPackage =? && (appVersion = 0)) order by positionNumber ASC`;
        result = await DB.query(sql, [req.body.forPackage]);
      }

      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };
  paymentMethodListV2 = async (req) => {
    var appVersion = req.body.appVersion ? parseInt(req.body.appVersion) : 0;
    var withRenewal = req.body.withRenewal ? parseInt(req.body.withRenewal) : 0;

    try {
      var sql;
      var result;
      if (appVersion > 93) {
        if (withRenewal == "1") {
          sql = `Select * from payment_methods where (deleted = 0 && (withRenewal =?) && forPackage =? && (appVersion = 0 || appVersion < ?)) order by positionNumber ASC`;

          result = await DB.query(sql, [
            withRenewal,
            req.body.forPackage,
            appVersion,
          ]);
        } else {
          sql = `Select * from payment_methods where (deleted = 0 && active = 1  && forPackage =? && (appVersion = 0 || appVersion < ?)) order by positionNumber ASC`;

          result = await DB.query(sql, [req.body.forPackage, appVersion]);
        }
      } else {
        if (withRenewal == "1") {
          sql = `Select * from payment_methods where (deleted = 0 && withRenewal =? && forPackage =? && (appVersion = 0)) order by positionNumber ASC`;
          result = await DB.query(sql, [withRenewal, req.body.forPackage]);
        } else {
          sql = `Select * from payment_methods where (deleted = 0 && active = 1 && forPackage =? && (appVersion = 0)) order by positionNumber ASC`;
          result = await DB.query(sql, [req.body.forPackage]);
        }
      }

      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };


  paymentMethodListV4 = async (req) => {
    var withRenewal = req.body.withRenewal;
    var userCountry = req.body.userCountry?.trim() ? req.body.userCountry : "BD";

    try {
      var result;

      const developmentSql = `
        SELECT * FROM payment_methods 
        WHERE is_auto_renewal = ? 
          AND forPackage = ? 
        ORDER BY positionNumber ASC
      `;

      let sql = `
        SELECT * FROM payment_methods 
        WHERE is_auto_renewal = ? 
          AND forPackage = ? 
          AND active = ? 
          AND (
            country = 'G' OR country = ?
          )
        ORDER BY positionNumber ASC
      `;

      if (req.query.forDevelopment) {
        result = await DB.query(developmentSql, [
          withRenewal,
          req.body.forPackage,
        ]);
      } else {
        const queryParams = [withRenewal, req.body.forPackage, 1, userCountry];
        result = await DB.query(sql, queryParams);
      }

      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };



  paymentMethodListV3 = async (req) => {
    var withRenewal = req.body.withRenewal ? parseInt(req.body.withRenewal) : 0;

    try {

      var result;
      const sql = `Select * from payment_methods where  is_auto_renewal = ? && forPackage =?  && active = ? order by positionNumber ASC`;
      const developmentSql = `Select * from payment_methods where  is_auto_renewal =? && forPackage =?  order by positionNumber ASC`;

      if (req.query.forDevelopment) {
        result = await DB.query(developmentSql, [
          withRenewal,
          req.body.forPackage,
        ]);
      }
      else {
        result = await DB.query(sql, [
          withRenewal,
          req.body.forPackage,
          1
        ]);
      }

      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  paymentMethodListWeb = async (req) => {
    try {
      const sql = `Select * from payment_methods where deleted = 0 && activeForWeb = 1 && forPackage =? order by positionNumber ASC`;
      // const ra = this.makeSubscriptionId(6)
      const result = await DB.query(sql, [req.body.forPackage]);

      return result;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return false;
    }
  };

  makeSubscriptionId(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    // var setResult = "Kabbik-" + result;
    return result;
  }
  bankCard = async (req) => {
    try {
      const { promo_id, card_type, bin_number, for_package } = req.body;

      const sql = `INSERT INTO promo_bin_mapping (promo_id, card_type, bin_number,for_package) VALUES (?,?,?,?)`;

      const result = await DB.query(sql, [
        promo_id,
        card_type,
        bin_number,
        for_package,
      ]);
      let finalRes;
      if (result.affectedRows == 1) {
        const sql = `select * from  promo_bin_mapping where promo_id=? and for_package=?`;
        const result2 = await DB.query(sql, [promo_id, for_package]);
        finalRes = result2;
        return finalRes;
      }
      return result;
    } catch (error) {
      console.error("Error in bankCard function:", error);
      throw error; // Rethrow the error for further handling
    }
  };

  referCodeGenerate = async (req) => {
    try {
      // const authorizationHeader = req.header("Authorization");
      // const jwttoken = authorizationHeader.split(" ")[1];
      // const DecodeJWT = (jwttoken) => {
      //   try {
      //     return JSON.parse(atob(jwttoken.split(".")[1]));
      //   } catch (e) {
      //     return null;
      //   }
      // };
      // const tokenData = DecodeJWT(jwttoken);
      // const { user_id } = tokenData;

      if (!req.currentUser.id) {
        return undefined;
      } else {
        const referralCode = generateReferralCode(6);

        let sql;
        sql = `UPDATE users SET refer_code = ? WHERE id =?`;
        let result = await DB.query(sql, [referralCode, req.currentUser.id]);
        return {
          refer_code: referralCode,
        };
      }
    } catch (error) {
      console.error("Error in bankCard function:", error);
      throw error; // Rethrow the error for further handling
    }
  };

  membershipNumberSubmit = async (req) => {
    try {
      // Check if the card already exists
      const checkCardQuery = `SELECT * FROM membership WHERE card = ?`;
      const queryResult = await DB.query(checkCardQuery, [req.body.card]);

      if (queryResult.length > 0) {
        return "Card Number Already Exists"; // Card already exists, so just return
      } else {
        // Get user and package details
        // const userQuery = `
        //   SELECT u.*, p.name AS package_name
        //   FROM users u
        //   JOIN packages p ON u.package_id = p.id
        //   WHERE u.id = ?
        // `;

        const userQuery = `
          SELECT *
          FROM users u left
          JOIN packages p ON u.package_id = p.id
          WHERE u.id = ?
        `;
        let userResult = await DB.query(userQuery, [req.body.id]);

        if (userResult.length === 0) {
          return "User Not Found"; // Return if user is not found
        }

        // Insert new membership record
        const sql = `INSERT INTO membership (name, phone, email, assigned_to, type, is_used, status, used_by, card, cvv, package_id, package_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let result = await DB.query(sql, [
          req.body.name,
          req.body.phone,
          req.body.email,
          req.body.assigned_to,
          req.body.type,
          req.body.is_used,
          req.body.status,
          req.body.id,
          req.body.card,
          req.body.cvv,
          userResult[0].package_id,
          userResult[0].package_name,
        ]);

        // Return the result of the insertion and user details
        return { result, user: userResult[0] };
      }
    } catch (error) {
      console.error("Error in membershipNumberSubmit function:", error);
      throw error;
    }
  };

  cardNumberSubmit = async (req) => {
    try {
      const { cvv } = req.body;

      // Check if the card exists and is valid
      const checkCardQuery = `SELECT * FROM membership WHERE cvv = ?`;
      const queryResult = await DB.query(checkCardQuery, [req.body.cvv]);

      if (queryResult.length > 0) {
        const membershipUpdateQuery = `        
          UPDATE membership
          SET is_used = 1,
            package_id = 1
          WHERE cvv = ?;
        `;
        const userUpdateQuery = `
          UPDATE users u
          JOIN membership m
          ON u.id = m.used_by
          SET u.is_subscribed = 1,
              u.package_id = 1,
              u.payment_method = 'membership',
              u.subscription_id = 'membership',
              u.next_purchase_time = UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 30 DAY)) * 1000
          WHERE m.cvv = ?;
        `;
        const membershipUpdateResult = await DB.query(membershipUpdateQuery, [
          req.body.cvv,
        ]);
        const userUpdateResult = await DB.query(userUpdateQuery, [
          req.body.cvv,
        ]);
        if (
          membershipUpdateResult.changedRows === 1 &&
          userUpdateResult.changedRows === 1
        ) {
          return { message: "Monthly package subscribed!", status: 200 };
        } else {
          return { message: "Already used this card", status: 200 };
        }
      } else {
        return "Card Not Found";
      }
    } catch (error) {
      console.error("Error in cardNumberSubmit function:", error);
      throw error;
    }
  };
}
function generateReferralCode(length) {
  return crypto
    .randomBytes(length)
    .toString("base64") // Convert to base64 format
    .replace(/\+/g, "0") // Replace '+' with '0' for URL safety
    .replace(/\//g, "1") // Replace '/' with '1' for URL safety
    .substring(0, length) // Cut to the required length
    .toUpperCase(); // Convert to uppercase
}

module.exports = new UserModelV4();
