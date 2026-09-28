const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");
const BkashModel = require("../../data/models/bkash-model");

const StatusCheck = require("../../utils/status-code-check");
const axios = require("axios");
const GlobalTask = require("../../utils/global-tasker");
class KabbikModel {
  tableName = "audiobooks";

  getAll = async () => {
    try {
      const sql =
        "SELECT a.*, c.name AS category_name FROM audiobooks AS a" +
        " LEFT JOIN categories AS c ON c.id = a.category_id WHERE a.approval_status = 1 AND a.deleted = 0";
      const result = await DB.query(sql);
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

  postSubscriptionLogs = async (req) => {
    
    try {
      const sql = `INSERT INTO logs_subscription_page(
                userAction,
                 view,
                  url,
                   browseLink,
                    forTask,
                     channel,
                      path,
                       source,
                        section,
                         platform,
                          campaign,
                           USERID,
                           subscriptionRequestId)
                    VALUES(?, ?, ? , ? , ? , ? , ?,?,?,?,?,?,?);`;
      const result = await DB.query(sql, [
        req.body.userAction,
        req.body.view,
        req.body.url,
        JSON.stringify(req.body.browseLink),
        req.body.forTask,
        req.body.channel,
        req.body.path,
        req.body.source,
        req.body.section,
        req.body.platform,
        req.body.campaign,
        req.body.USERID,
        req.body.subscriptionRequestId,
      ]);
      if (result) {
                return result;
      }
          } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  totalPurchaseAmount = async () => {
    try {
      const sql =
        'SELECT sum(amount) as total_purchase_amount FROM payments where sp_massage = "Success";';
      const result = await DB.query(sql);
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

  totalPurchaseAmountDateWise = async (datait) => {
        try {
      const sql =
        'SELECT sum(amount) as total_purchase_amount FROM payments where sp_massage = "Success"  AND (DATE_FORMAT(created_at, "%Y%c%d") >= ?);';
      const result = await DB.query(sql, [datait]);
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

  lastTransactionList = async (totalTransaction) => {
        try {
      var sql;

      if (totalTransaction == null) {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id order by pm.created_at desc";
      } else {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id order by pm.created_at desc limit " +
          totalTransaction +
          "";
      }
      const result = await DB.query(sql);
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

  totalItem = async () => {
        try {
      const sql =
        "SELECT COUNT(*) as total FROM payments as pm LEFT join users as us on pm.user_id = us.id";
      const result = await DB.query(sql);
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

  totalItemFailed = async () => {
        try {
      const sql =
        "SELECT COUNT(*) as total FROM payments as pm LEFT join users as us on pm.user_id = us.id  where pm.sp_massage != 'Success' ";
      const result = await DB.query(sql);
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

  totalItemSuccessFull = async () => {
        try {
      const sql =
        "SELECT COUNT(*) as total FROM payments as pm LEFT join users as us on pm.user_id = us.id  where pm.sp_massage = 'Success' ";
      const result = await DB.query(sql);
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

  lastFailedTransactionList = async (totalTransaction) => {
        try {
      var sql;

      if (totalTransaction == null) {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id where pm.sp_massage != 'Success' order by pm.created_at desc";
      } else {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id where pm.sp_massage != 'Success' order by pm.created_at desc limit " +
          totalTransaction +
          "";
      }
      const result = await DB.query(sql);
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

  getPromocodeAdmin = async (req) => {
    
    try {
      const sqlPromo = `SELECT 
    pr.*,
    (SELECT COUNT(*) FROM bkash_invoice where promoCode = pr.promoCode AND channel = pr.for_screen AND subscribed=1 AND package_id = pr.for_package) as total_bkash_Subscribed,
    (SELECT COUNT(*) FROM bkash_onetime where promo_code = pr.promoCode AND subscribed=1 AND packageId = pr.for_package) as total_bKash_Onetime
FROM
    promo as pr
WHERE pr.status = ?`;

      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const resultPromo = await DB.query(sqlPromo, [1]);

      // Assuming 'data' is the result of your SQL query
      resultPromo.map((item) => {
        item.total_Subscribed = `recurring: ${item.total_bkash_Subscribed} - onetime: ${item.total_bKash_Onetime}`;
        return item;
      });

      if (resultPromo) {
        return {
          data: resultPromo,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  lastSuccessfulTransactionList = async (totalTransaction) => {
        try {
      var sql;

      if (totalTransaction == null) {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id where pm.sp_massage = 'Success' order by pm.created_at desc";
      } else {
        sql =
          "SELECT us.user_name,us.full_name, us.phone_no, pm.* FROM payments as pm LEFT join users as us on pm.user_id = us.id where pm.sp_massage = 'Success' order by pm.created_at desc limit " +
          totalTransaction +
          "";
      }
      const result = await DB.query(sql);
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

  lastSubscriptionList = async () => {
    // console.log("oval: "+totalTransaction)
    try {
      var sql;

      sql =
        "SELECT us.user_name,us.full_name, us.phone_no, us.payment_method, us.package_id, us.purchase_time FROM users as us where us.is_subscribed = 1 Order by us.purchase_time desc";

      const result = await DB.query(sql);
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

  getSubscriptionDetails = async (requestID) => {
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
        requestID;

      var config = {
        method: "get",
        url: url,
        headers: headers,
      };

            const obj = await axios(config)
        .then(function (response) {
          // that.addResponseQueryData(JSON.stringify(response.data))

          // console.log("ythen: " + JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
            return obj;
    } catch (error) {
      console.log("Failed");
      console.log(error);
      return null;
    }
  };

  latestSubscribedUser = async () => {
        try {
      var sql;

      sql =
        "SELECT us.user_name,us.full_name, us.phone_no, us.payment_method, us.package_id, us.subscription_id, us.purchase_time FROM users as us where us.is_subscribed = 1 Order by us.purchase_time desc";

      const result = await DB.query(sql);
      if (result) {
        for (var i = 0; i < result.length; i++) {
          const sqlPayer =
            "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

          const resp = await DB.query(sqlPayer, [result[i].subscription_id]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
                    if (resp) {
            if (resp.length > 0) {
              result[i].payer_no = resp[0].payer;
            }
          }

          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscription_id,
          ]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }

          // console.log(resp.payer_no)
        }
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  lifetimeSubscribedUser = async () => {
        try {
      var sql;

      sql =
        "SELECT us.user_name,us.full_name, us.phone_no, us.payment_method, us.package_id, us.subscription_id, us.purchase_time FROM users as us where us.is_subscribed = 1 Order by us.purchase_time desc";

      const result = await DB.query(sql);
      if (result) {
        for (var i = 0; i < result.length; i++) {
          const sqlPayer =
            "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

          const resp = await DB.query(sqlPayer, [result[i].subscription_id]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
                    if (resp) {
            if (resp.length > 0) {
              result[i].payer_no = resp[0].payer;
            }
          }

          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscription_id,
          ]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }

          // console.log(resp.payer_no)
        }
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  revenueSummary = async () => {
        try {
      var sql;

      sql = `SELECT sum(bw.amount) as amount, DATE_FORMAT(cast(bw.created_at as date), '%Y-%c-%d') as date FROM kabbik.bkash_webhook as bw where bw.paymentStatus = 'SUCCEEDED_PAYMENT' AND (DATE_FORMAT(bw.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')) group by date`;

      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  revenueSummaryPGW = async () => {
        try {
      var sql;

      sql = `SELECT sum(bw.amount) as amount FROM 
            kabbik.bkash_webhook AS bw
          WHERE 
            bw.paymentStatus = 'SUCCEEDED_PAYMENT' 
            AND bw.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND bw.created_at < CURDATE()`;

      const result = await DB.query(sql);

      var sqlBkashRecurring = `SELECT 
            SUM(bw.amount) AS amount,
            DATE_FORMAT(bw.created_at, '%Y-%m-%d') AS date
          FROM 
            kabbik.bkash_webhook AS bw
          WHERE 
            bw.paymentStatus = 'SUCCEEDED_PAYMENT' 
            AND bw.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND bw.created_at < CURDATE()
          GROUP BY 
            date
          ORDER BY 
            date DESC`;

      const resultBkashRecurring = await DB.query(sqlBkashRecurring);

      // var sqlBkashRecurring = `SELECT sum(bw.amount) as amount, DATE_FORMAT(bw.created_at,
      // '%Y-%m-%d') as date FROM kabbik.bkash_webhook as bw where bw.paymentStatus = 'SUCCEEDED_PAYMENT' AND (DATE_FORMAT(bw.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')) group by date order by date desc`;

      // const resultBkashRecurring = await DB.query(sqlBkashRecurring);

      var sqlBkashOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.bkash_onetime AS tb
        WHERE 
            tb.executeStatusMessage = 'Successful' 
            AND tb.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;

      const resultBkashOnetime = await DB.query(sqlBkashOnetime);

      var sqlDaywiseBkashOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM 
            kabbik.bkash_onetime AS tb
        WHERE 
            tb.executeStatusMessage = 'Successful' 
            AND tb.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY 
            CAST(tb.created_at AS DATE)
        ORDER BY 
            date DESC;`;

      const resultDaywiseBkashOnetime = await DB.query(sqlDaywiseBkashOnetime);

      var sqlNagadOnetime = `SELECT sum(tb.amount) as amount  FROM
            kabbik.nagad_payment AS tb
            WHERE
            tb.status = 'Success'
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;

      const resultNagadOnetime = await DB.query(sqlNagadOnetime);

      var sqlDaywiseNagadOnetime = `SELECT
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM
            kabbik.nagad_payment AS tb
        WHERE
            tb.status = 'Success'
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY
            CAST(tb.created_at AS DATE)
        ORDER BY
            date DESC;`;

      const resultDaywiseNagadOnetime = await DB.query(sqlDaywiseNagadOnetime);

      var sqlSurjopayOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.payments AS tb
          WHERE 
            tb.sp_massage = 'Success' 
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;

      const resultSurjopayOnetime = await DB.query(sqlSurjopayOnetime);

      var sqlDaywiseSurjopayOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
          FROM 
            kabbik.payments AS tb
          WHERE 
            tb.sp_massage = 'Success' 
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY 
            CAST(tb.created_at AS DATE)
          ORDER BY 
            date DESC`;

      const resultDaywiseSurjopayOnetime = await DB.query(
        sqlDaywiseSurjopayOnetime
      );

      var sqlUpayOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.upay_payment AS tb
        WHERE 
            tb.status = 'Success' 
            AND tb.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`;

      const resultUpayOnetime = await DB.query(sqlUpayOnetime);

      var sqlDaywiseUpayOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM 
            kabbik.upay_payment AS tb
        WHERE 
            tb.status = 'Success' 
            AND tb.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY 
            CAST(tb.created_at AS DATE)
        ORDER BY 
            date DESC;`;

      const resultDaywiseUpayOnetime = await DB.query(sqlDaywiseUpayOnetime);

      return {
        bKashRecurring: result[0].amount,
        bKashRecurringSUmmary: resultBkashRecurring,
        bkashOnetime: resultBkashOnetime[0].amount,
        bkashOnetimeSummary: resultDaywiseBkashOnetime,
        nagadOnetime: resultNagadOnetime[0].amount,
        nagadOnetimeSummary: resultDaywiseNagadOnetime,
        resultSurjopayOnetime: resultSurjopayOnetime[0].amount,
        resultSurjopayOnetimeSummary: resultDaywiseSurjopayOnetime,
        resultUpayOnetime: resultUpayOnetime[0].amount,
        resultUpayOnetimeSUmmary: resultDaywiseUpayOnetime,
      };
      // return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  revenueSummaryPGW30Days = async () => {
        try {
      var sql;

      sql = `SELECT sum(bw.amount) as amount FROM 
            kabbik.bkash_webhook AS bw
          WHERE 
            bw.paymentStatus = 'SUCCEEDED_PAYMENT' 
            AND bw.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND bw.created_at < CURDATE()`;

      const result = await DB.query(sql);

      var sqlBkashRecurring = `SELECT 
            SUM(bw.amount) AS amount,
            DATE_FORMAT(bw.created_at, '%Y-%m-%d') AS date
          FROM 
            kabbik.bkash_webhook AS bw
          WHERE 
            bw.paymentStatus = 'SUCCEEDED_PAYMENT' 
            AND bw.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND bw.created_at < CURDATE()
          GROUP BY 
            date
          ORDER BY 
            date DESC`;

      const resultBkashRecurring = await DB.query(sqlBkashRecurring);

      // var sqlBkashRecurring = `SELECT sum(bw.amount) as amount, DATE_FORMAT(bw.created_at,
      // '%Y-%m-%d') as date FROM kabbik.bkash_webhook as bw where bw.paymentStatus = 'SUCCEEDED_PAYMENT' AND (DATE_FORMAT(bw.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')) group by date order by date desc`;

      // const resultBkashRecurring = await DB.query(sqlBkashRecurring);

      var sqlBkashOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.bkash_onetime AS tb
        WHERE 
            tb.executeStatusMessage = 'Successful' 
            AND tb.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;

      const resultBkashOnetime = await DB.query(sqlBkashOnetime);

      var sqlDaywiseBkashOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM 
            kabbik.bkash_onetime AS tb
        WHERE 
            tb.executeStatusMessage = 'Successful' 
            AND tb.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY 
            CAST(tb.created_at AS DATE)
        ORDER BY 
            date DESC;`;

      const resultDaywiseBkashOnetime = await DB.query(sqlDaywiseBkashOnetime);

      var sqlNagadOnetime = `SELECT sum(tb.amount) as amount  FROM
            kabbik.nagad_payment AS tb
            WHERE
            tb.status = 'Success'
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;

      const resultNagadOnetime = await DB.query(sqlNagadOnetime);

      var sqlDaywiseNagadOnetime = `SELECT
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM
            kabbik.nagad_payment AS tb
        WHERE
            tb.status = 'Success'
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY
            CAST(tb.created_at AS DATE)
        ORDER BY
            date DESC;`;

      const resultDaywiseNagadOnetime = await DB.query(sqlDaywiseNagadOnetime);

      var sqlSurjopayOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.payments AS tb
          WHERE 
            tb.sp_massage = 'Success' 
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;

      const resultSurjopayOnetime = await DB.query(sqlSurjopayOnetime);

      var sqlDaywiseSurjopayOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
          FROM 
            kabbik.payments AS tb
          WHERE 
            tb.sp_massage = 'Success' 
            AND tb.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY 
            CAST(tb.created_at AS DATE)
          ORDER BY 
            date DESC`;

      const resultDaywiseSurjopayOnetime = await DB.query(
        sqlDaywiseSurjopayOnetime
      );

      var sqlUpayOnetime = `SELECT sum(tb.amount) as amount FROM 
            kabbik.upay_payment AS tb
        WHERE 
            tb.status = 'Success' 
            AND tb.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`;

      const resultUpayOnetime = await DB.query(sqlUpayOnetime);

      var sqlDaywiseUpayOnetime = `SELECT 
            SUM(tb.amount) AS amount,
            DATE_FORMAT(CONVERT_TZ(tb.created_at, '+00:00', '+6:00'), '%Y-%m-%d') AS date
        FROM 
            kabbik.upay_payment AS tb
        WHERE 
            tb.status = 'Success' 
            AND tb.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY 
            CAST(tb.created_at AS DATE)
        ORDER BY 
            date DESC;`;

      const resultDaywiseUpayOnetime = await DB.query(sqlDaywiseUpayOnetime);

      return {
        bKashRecurring: result[0].amount,
        bKashRecurringSUmmary: resultBkashRecurring,
        bkashOnetime: resultBkashOnetime[0].amount,
        bkashOnetimeSummary: resultDaywiseBkashOnetime,
        nagadOnetime: resultNagadOnetime[0].amount,
        nagadOnetimeSummary: resultDaywiseNagadOnetime,
        resultSurjopayOnetime: resultSurjopayOnetime[0].amount,
        resultSurjopayOnetimeSummary: resultDaywiseSurjopayOnetime,
        resultUpayOnetime: resultUpayOnetime[0].amount,
        resultUpayOnetimeSUmmary: resultDaywiseUpayOnetime,
      };
      // return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  allPGWSubscriberCount = async () => {
        try {
      var sql;

      sql = `SELECT count(distinct bw.subscriptionRequestId) as count FROM kabbik.bkash_webhook as bw where bw.paymentStatus = 'SUCCEEDED_PAYMENT'`;

      const result = await DB.query(sql);

      var sqlCancelled = `SELECT count(distinct bw.subscriptionRequestId) as count FROM kabbik.bkash_webhook as bw where bw.subscriptionStatus = 'CANCELLED'`;

      const resultCancelled = await DB.query(sqlCancelled);

      // var sqlBkashRecurring = `SELECT sum(bw.amount) as amount, cast(bw.created_at as date) as date FROM kabbik.bkash_webhook as bw where bw.paymentStatus = 'SUCCEEDED_PAYMENT' AND (DATE_FORMAT(bw.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')) group by cast(bw.created_at as date) order by date desc`;

      // const resultBkashRecurring = await DB.query(sqlBkashRecurring);

      var sqlBkashOnetime = `SELECT count(distinct tb.paymentID) as count FROM kabbik.bkash_onetime as tb where tb.executeStatusMessage = 'Successful'`;

      const resultBkashOnetime = await DB.query(sqlBkashOnetime);

      // var sqlDaywiseBkashOnetime = `SELECT sum(tb.amount) as amount, cast(tb.created_at as date) as date FROM kabbik.bkash_onetime as tb where tb.executeStatusMessage = 'Successful' AND (DATE_FORMAT(tb.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')) group by cast(tb.created_at as date) order by date desc`;

      // const resultDaywiseBkashOnetime = await DB.query(sqlDaywiseBkashOnetime);

      var sqlNagadOnetime = `SELECT count(distinct tb.orderId) as count FROM kabbik.nagad_payment as tb where tb.status= 'Success'`;

      const resultNagadOnetime = await DB.query(sqlNagadOnetime);

      // var sqlDaywiseNagadOnetime = `SELECT sum(tb.amount) as amount, cast(tb.created_at as date) as date FROM kabbik.nagad_payment as tb where tb.status = 'Success' AND (DATE_FORMAT(tb.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')) group by cast(tb.created_at as date) order by date desc`;

      // const resultDaywiseNagadOnetime = await DB.query(sqlDaywiseNagadOnetime);

      var sqlSurjopayOnetime = `SELECT count(distinct tb.sp_order_id) as count FROM kabbik.payments as tb where tb.sp_massage= 'Success'`;

      const resultSurjopayOnetime = await DB.query(sqlSurjopayOnetime);

      // var sqlDaywiseSurjopayOnetime = `SELECT sum(tb.amount) as amount, cast(tb.created_at as date) as date FROM kabbik.payments as tb where tb.sp_massage = 'Success' AND (DATE_FORMAT(tb.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')) group by cast(tb.created_at as date) order by date desc`;

      // const resultDaywiseSurjopayOnetime = await DB.query(sqlDaywiseSurjopayOnetime);

      var sqlUpayOnetime = `SELECT count(distinct tb.invoice_id) as count FROM kabbik.upay_payment as tb where tb.status= 'Success'`;

      const resultUpayOnetime = await DB.query(sqlUpayOnetime);

      var sqlPackageWiseSUbscription = `SELECT count(us.id) as total, us.package_id, sp.name FROM kabbik.users as us left join subscription_packages as sp on sp.subscriptionItemId = us.package_id where us.is_subscribed = 1 group by us.package_id;`;

      const resultPackageWiseSUbscription = await DB.query(
        sqlPackageWiseSUbscription
      );

      // var sqlDaywiseUpayOnetime = `SELECT sum(tb.amount) as amount, cast(tb.created_at as date) as date FROM kabbik.upay_payment as tb where tb.status = 'Success' AND (DATE_FORMAT(tb.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')) group by cast(tb.created_at as date) order by date desc`;

      // const resultDaywiseUpayOnetime = await DB.query(sqlDaywiseUpayOnetime);

      return {
        bKashRecurring: result[0].count,
        bkashOnetime: resultBkashOnetime[0].count,
        nagadOnetime: resultNagadOnetime[0].count,
        resultSurjopayOnetime: resultSurjopayOnetime[0].count,
        resultUpayOnetime: resultUpayOnetime[0].count,
        cancelledBKashRecurring: resultCancelled[0].count,
        packagewisePresentSubscription: resultPackageWiseSUbscription,
      };
      // return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  latestTransactionsWebhook = async () => {
        try {
      var sql;

      sql =
        "SELECT bw.paymentStatus, bw.trxId, bw.amount, bi.payer as payer_no, bw.dueDate, bw.subscriptionRequestId, bw.nextPaymentDate, bw.subscriptionStatus, bw.type, us.user_name,  us.subscription_id, us.full_name, us.phone_no, us.address, us.city, us.is_subscribed FROM bkash_webhook as bw Left Join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId left join users as us on us.id = bi.userId order by bw.id desc";

      const result = await DB.query(sql);
      if (result) {
        // for (var i = 0; i < result.length; i++) {
        //     const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

        //     const resp = await DB.query(sqlPayer, [result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     console.log(resp)
        //     if (resp) {
        //         if (resp.length > 0) {
        //             result[i].payer_no = resp[0].payer
        //         }
        //     }

        //     const sqlPromotion = "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

        //     const resPromotion = await DB.query(sqlPromotion, [1, result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     // console.log(resPromotion)
        //     if (resPromotion) {
        //         if (resPromotion.length > 0) {
        //             result[i].came_from_promotion = resPromotion[0].company_name
        //         }else{
        //             result[i].came_from_promotion = ""
        //         }
        //     }

        //     // console.log(resp.payer_no)
        // };

        for (var i = 0; i < result.length; i++) {
          // const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

          // const resp = await DB.query(sqlPayer, [result[i].subscriptionRequestId]);
          // // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resp)
          // if (resp) {
          //     if (resp.length > 0) {
          //         result[i].payer_no = resp[0].payer
          //     }
          // }

          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscriptionRequestId,
          ]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }

          // console.log(resp.payer_no)
        }

        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  wasSubscribedThenCanceled = async () => {
        try {
      var sql;

      sql = `SELECT bw.paymentStatus, bw.trxId, bw.amount,bi.payer as payer_no, bw.dueDate, bw.subscriptionRequestId, bw.nextPaymentDate, bw.subscriptionStatus, bw.type, us.user_name,  us.subscription_id, us.full_name, us.phone_no, us.address, us.city, us.is_subscribed FROM bkash_webhook as bw Left Join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId left join users as us on us.id = bi.userId 
            Where bw.subscriptionStatus ="CANCELLED" AND bw.subscriptionRequestId in (Select bww.subscriptionRequestId FROM bkash_webhook as bww Where bww.paymentStatus = "SUCCEEDED_PAYMENT") order by bw.id desc`;

      const result = await DB.query(sql);
      if (result) {
        // for (var i = 0; i < result.length; i++) {
        //     const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

        //     const resp = await DB.query(sqlPayer, [result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     console.log(resp)
        //     if (resp) {
        //         if (resp.length > 0) {
        //             result[i].payer_no = resp[0].payer
        //         }
        //     }

        //     const sqlPromotion = "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

        //     const resPromotion = await DB.query(sqlPromotion, [1, result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     // console.log(resPromotion)
        //     if (resPromotion) {
        //         if (resPromotion.length > 0) {
        //             result[i].came_from_promotion = resPromotion[0].company_name
        //         }else{
        //             result[i].came_from_promotion = ""
        //         }
        //     }

        //     // console.log(resp.payer_no)
        // };

        for (var i = 0; i < result.length; i++) {
          // const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

          // const resp = await DB.query(sqlPayer, [result[i].subscriptionRequestId]);
          // // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resp)
          // if (resp) {
          //     if (resp.length > 0) {
          //         result[i].payer_no = resp[0].payer
          //     }
          // }

          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscriptionRequestId,
          ]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }

          // console.log(resp.payer_no)
        }

        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  firstSubscribedTryThenFailed = async () => {
        try {
      var sql;

      sql = `SELECT bw.paymentStatus, bw.trxId, bw.amount,bi.payer as payer_no, bw.dueDate, bw.subscriptionRequestId, bw.nextPaymentDate, bw.subscriptionStatus, bw.type, us.user_name,  us.subscription_id, us.full_name, us.phone_no, us.address, us.city, us.is_subscribed FROM bkash_webhook as bw Left Join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId left join users as us on us.id = bi.userId 
            Where bw.subscriptionStatus ="CANCELLED" AND bw.subscriptionRequestId not in (Select bww.subscriptionRequestId FROM bkash_webhook as bww Where bww.paymentStatus = "SUCCEEDED_PAYMENT") order by bw.id desc`;

      const result = await DB.query(sql);
      if (result) {
        // for (var i = 0; i < result.length; i++) {
        //     const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

        //     const resp = await DB.query(sqlPayer, [result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     console.log(resp)
        //     if (resp) {
        //         if (resp.length > 0) {
        //             result[i].payer_no = resp[0].payer
        //         }
        //     }

        //     const sqlPromotion = "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

        //     const resPromotion = await DB.query(sqlPromotion, [1, result[i].subscription_id]);
        //     // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
        //     // console.log(resPromotion)
        //     if (resPromotion) {
        //         if (resPromotion.length > 0) {
        //             result[i].came_from_promotion = resPromotion[0].company_name
        //         }else{
        //             result[i].came_from_promotion = ""
        //         }
        //     }

        //     // console.log(resp.payer_no)
        // };

        for (var i = 0; i < result.length; i++) {
          // const sqlPayer = "SELECT * FROM bkash_invoice where subscriptionRequestId = ?";

          // const resp = await DB.query(sqlPayer, [result[i].subscriptionRequestId]);
          // // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resp)
          // if (resp) {
          //     if (resp.length > 0) {
          //         result[i].payer_no = resp[0].payer
          //     }
          // }

          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscriptionRequestId,
          ]);
          // var resp = await this.getSubscriptionDetails(result[i].subscription_id)
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }

          // console.log(resp.payer_no)
        }

        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  todayCancelledSubscription = async () => {
        try {
      var sql;

      sql = `SELECT bw.paymentStatus, bw.trxId, bw.amount,bi.payer as payer_no, bw.dueDate, bw.subscriptionRequestId, bw.nextPaymentDate, bw.subscriptionStatus, bw.type, us.user_name,  us.subscription_id, us.full_name, us.phone_no, us.address, us.city, us.is_subscribed FROM bkash_webhook as bw Left Join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId left join users as us on us.id = bi.userId 
            Where bw.subscriptionStatus ="CANCELLED" AND bw.subscriptionRequestId not in 
            (Select bww.subscriptionRequestId FROM bkash_webhook as bww Where bww.paymentStatus = "SUCCEEDED_PAYMENT" 
            AND 
            (DATE_FORMAT(CONVERT_TZ(bww.created_at, '+00:00', '+6:00'), '%Y%m%d') 
            >= 
            DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'), '%Y%m%d'))) 
            AND (DATE_FORMAT(CONVERT_TZ(bw.created_at, '+00:00', '+6:00'), '%Y%m%d') 
            >= 
            DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),'%Y%m%d')) 
            order by bw.id desc`;

      const result = await DB.query(sql);
      if (result) {
        for (var i = 0; i < result.length; i++) {
          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscriptionRequestId,
          ]);
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }
        }

        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  todaySubscriptionNew = async () => {
        try {
      var sql;

      sql = `SELECT bw.paymentStatus, bw.trxId, bw.amount,bi.payer as payer_no, bw.dueDate, bw.subscriptionRequestId, bw.nextPaymentDate, bw.subscriptionStatus, bw.type, us.user_name,  us.subscription_id, us.full_name, us.phone_no, us.address, us.city, us.is_subscribed FROM bkash_webhook as bw Left Join bkash_invoice as bi on bw.subscriptionRequestId = bi.subscriptionRequestId left join users as us on us.id = bi.userId 
            Where bw.paymentStatus = "SUCCEEDED_PAYMENT"
            AND (DATE_FORMAT(CONVERT_TZ(bw.created_at, '+00:00', '+6:00'), '%Y%m%d') 
            >= 
            DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),'%Y%m%d')) 
            order by bw.id desc`;

      const result = await DB.query(sql);
      if (result) {
        for (var i = 0; i < result.length; i++) {
          const sqlPromotion =
            "SELECT * FROM promotion_track_table where successStatus = ? AND bkash_request_id = ?";

          const resPromotion = await DB.query(sqlPromotion, [
            1,
            result[i].subscriptionRequestId,
          ]);
          // console.log(resPromotion)
          if (resPromotion) {
            if (resPromotion.length > 0) {
              result[i].came_from_promotion = resPromotion[0].company_name;
            } else {
              result[i].came_from_promotion = "";
            }
          }
        }

        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  latestReviewList = async (req) => {
    try {
      let startDate = req.query.startDate;
      let endDate = req.query.endDate;
                  if (startDate == null || endDate == null) {
        return "No start date or end date";
      } else {
                const sql = `SELECT 
                ab.id as audiobook_id,
                ab.name,
                ab.thumb_path,
                us.user_name,
                us.full_name,
                us.phone_no,
                rat.rating,
                rat.review,
                DATE_FORMAT(CONVERT_TZ(rat.created_at, '+00:00', '+6:00'),
                                '%Y-%m-%d') as rating_date
            FROM
                ratings AS rat
                    LEFT JOIN
                audiobooks AS ab ON rat.audiobook_id = ab.id
                    LEFT JOIN
                users AS us ON rat.user_id = us.id
        order by rat.id desc limit 100;`;
        const result = await DB.query(sql);
        if (result) {
          return result;
        }
        return undefined;
      }
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updatePayer = async () => {
        try {
      var sql;

      sql = "SELECT * FROM bkash_invoice";

      const result = await DB.query(sql);
      if (result) {
        for (var i = 0; i < result.length; i++) {
          var resp = await this.getSubscriptionDetails(
            result[i].subscriptionRequestId
          );
          
          const sqlPayer = `UPDATE bkash_invoice set payer =? WHERE split_part = ?;`;
          const resultPayer = await DB.query(sqlPayer, [
            resp.payer,
            result[i].split_part,
          ]);
        }
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  totalSubscribedUserCount = async () => {
    // console.log("oval: "+totalTransaction)
    try {
      var sql;

      sql =
        "SELECT COUNT(*) as total_subscribers FROM users as us where us.is_subscribed = 1";

      const result = await DB.query(sql);
      if (result) {
        return result[0];
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  userSummary = async (userId, req) => {
    let data = {};
        try {
      var sql, sql2;

      sql2 =
        "SELECT count(*) as total_played_audiobook FROM audiobook_play_count_log where user_id = ?";
      const result2 = await DB.query(sql2, [userId]);

      data.total_played_audiobook = result2[0].total_played_audiobook;

      sql = `SELECT 
            apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
        FROM
            audiobook_play_count_log AS apcl
                LEFT JOIN
            audiobooks AS ab ON ab.id = apcl.audiobook_id
        WHERE
            apcl.audiobook_id IS NOT NULL AND apcl.from_channel = "android" AND user_id = ?
            GROUP BY apcl.audiobook_id
            ORDER BY total_played DESC
            LIMIT 5;`;
      const result = await DB.query(sql, [userId]);

      data.most_played_audiobook = result;
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "UserSummary",
        endpoint: "/v1/kabbikanalytics/user-summary",
        forTask: "Users",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });

      // data.push({ name: 'total_played_audiobook', data: result[0].total_played_audiobook });
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  signupHistory = async (previousDays) => {
    if (previousDays == null) {
      previousDays = 7;
    }
        try {
      const sql =
        "SELECT * FROM users WHERE (DATE_FORMAT(users.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), " +
        previousDays +
        "), '%Y%c%d')) order by created_at desc";
      const result = await DB.query(sql);
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

  signupHistoryChannel = async (fromChannel) => {
        try {
      let sql;
      if (fromChannel == null) {
        sql = "SELECT * FROM users order by created_at desc";
      } else {
        sql =
          "SELECT * FROM users where channel = " +
          fromChannel +
          "  order by created_at desc";
      }
      const result = await DB.query(sql);
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

  mostListenedAudiobook = async (totalItemFetch) => {
    try {
      var sql;
      if (totalItemFetch == null) {
                sql =
          "SELECT * FROM audiobooks WHERE deleted=0 and approval_status=1 order by play_count desc";
      } else {
                sql =
          "SELECT * FROM audiobooks WHERE deleted=0 and approval_status=1 order by play_count desc limit " +
          totalItemFetch +
          "";
      }
      const result = await DB.query(sql);
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

  mostPurchasedAudiobook = async (totalItemFetch) => {
    try {
      var sql;
      if (totalItemFetch == null) {
                sql =
          "SELECT ab.*,COUNT(ul.audiobook_id) AS total_sell FROM users_library AS ul LEFT JOIN audiobooks AS ab  ON ul.audiobook_id = ab.id WHERE (DATE_FORMAT(ul.created_at, '%Y%c%d')) > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d') GROUP BY ul.audiobook_id ORDER BY total_sell DESC";
      } else {
                sql =
          "SELECT ab.*,COUNT(ul.audiobook_id) AS total_sell FROM users_library AS ul LEFT JOIN audiobooks AS ab  ON ul.audiobook_id = ab.id WHERE (DATE_FORMAT(ul.created_at, '%Y%c%d')) > DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d') GROUP BY ul.audiobook_id ORDER BY total_sell DESC limit " +
          totalItemFetch +
          "";
      }
      const result = await DB.query(sql);
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

  mostRatedAudiobook = async (lastdaysago) => {
    try {
      var sql;
      if (lastdaysago == null) {
                sql =
          "SELECT ab.*, COUNT(*) AS total_rate FROM ratings AS rt LEFT JOIN audiobooks AS ab ON rt.audiobook_id = ab.id GROUP BY rt.audiobook_id ORDER BY total_rate DESC";
      } else {
                sql =
          "SELECT ab.*, COUNT(*) AS total_rate FROM ratings AS rt LEFT JOIN audiobooks AS ab ON rt.audiobook_id = ab.id WHERE (DATE_FORMAT(rt.created_at, '%Y%c%d') > DATE_FORMAT(SUBDATE(NOW(), " +
          lastdaysago +
          "), '%Y%c%d')) GROUP BY rt.audiobook_id ORDER BY total_rate DESC";
      }
      const result = await DB.query(sql);
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

  audioBookPlayCount = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT
                us.user_name,
                us.phone_no,
                ab.name as audiobook_name,
                ab.price,
                apcl.from_channel,
                apcl.audiobook_id,
                apcl.created_at,
                apcl.updated_at
            FROM
                audiobook_play_count_log apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
                where apcl.audiobook_id is not null
            ORDER BY apcl.created_at DESC;`;
      } else {
                sql =
          `SELECT
                us.user_name,
                us.phone_no,
                ab.name as audiobook_name,
                ab.price,
                apcl.from_channel,
                apcl.audiobook_id,
                apcl.created_at,
                apcl.updated_at
            FROM
                audiobook_play_count_log apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
                where apcl.audiobook_id is not null AND 
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
            ORDER BY apcl.created_at DESC;`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountTotal = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE
                apcl.audiobook_id IS NOT NULL
            GROUP BY apcl.audiobook_id
            ORDER BY total_played DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE
                apcl.audiobook_id IS NOT NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
                GROUP BY apcl.audiobook_id
                ORDER BY total_played DESC;`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountTotalFromWeb = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id = apcl.audiobook_id
            WHERE
                apcl.audiobook_id IS NOT NULL AND apcl.from_channel = "web"
            GROUP BY apcl.audiobook_id
            ORDER BY total_played DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id = apcl.audiobook_id
            WHERE
                apcl.audiobook_id IS NOT NULL AND apcl.from_channel = "web" AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
                GROUP BY apcl.audiobook_id
                ORDER BY total_played DESC;`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountTotalFromAndroid = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id = apcl.audiobook_id
            WHERE
                apcl.audiobook_id IS NOT NULL AND apcl.from_channel = "android"
            GROUP BY apcl.audiobook_id
            ORDER BY total_played DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.id, apcl.audiobook_id, ab.name as audiobook_name, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id = apcl.audiobook_id
            WHERE
                apcl.audiobook_id IS NOT NULL AND apcl.from_channel = "android" AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
                GROUP BY apcl.audiobook_id
                ORDER BY total_played DESC;`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountTop10 = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
        return "No Start Date/End Date specified";
      } else {
                sql =
          `SELECT 
            apcl.id, ab.id as audiobook_id, ab.name as audiobook_name, COUNT(*) AS total_played, apcl.created_at
        FROM
            audiobook_play_count_log AS apcl
                LEFT JOIN
            episodes AS ep ON apcl.episode_id = ep.id
                LEFT JOIN
            audiobooks AS ab ON ep.audiobook_id = ab.id
        WHERE
            apcl.episode_id IS NOT NULL AND apcl.from_channel = "android" AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'), '%Y-%m-%d') >= "` +
          startDate +
          `") AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'), '%Y-%m-%d') <= "` +
          endDate +
          `")
            GROUP BY ab.id
            ORDER BY total_played DESC
                LIMIT 10;`;
      }
      const result = await DB.query(sql);
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
  dailyAudiobookPlaylist = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
        return "No Start Date/End Date specified";
      } else {
                sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE apcl.episode_id IS Not Null AND
            ab.publisher_id = 22 AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountEpisodeTotalFromWeb = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.id, ab.name as audiobook_name, ep.name as episode_name, apcl.from_channel, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
            WHERE
                apcl.episode_id IS NOT NULL AND apcl.from_channel = "web"
            GROUP BY apcl.episode_id
            ORDER BY total_played DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.id, ab.name as audiobook_name, ep.name as episode_name, apcl.from_channel, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
            WHERE
                apcl.episode_id IS NOT NULL AND apcl.from_channel = "web" AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
                GROUP BY apcl.episode_id
                ORDER BY total_played DESC;`;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountTotalEpisodeFromAndroid = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.id, ab.name as audiobook_name, ep.name as episode_name, apcl.from_channel, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
            WHERE
                apcl.episode_id IS NOT NULL AND apcl.from_channel = "android"
            GROUP BY apcl.episode_id
            ORDER BY total_played DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.id, ab.name as audiobook_name, ep.name as episode_name, apcl.from_channel, COUNT(apcl.id) AS total_played, apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
            WHERE
                apcl.episode_id IS NOT NULL AND apcl.from_channel = "android" AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
                GROUP BY apcl.episode_id
                ORDER BY total_played DESC;`;
      }
      const result = await DB.query(sql);
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

  topUsersEpisode = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.user_id,
                us.user_name,
                us.full_name,
                us.address,
                COUNT(apcl.user_id) AS total_views,
                us.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
            WHERE
                apcl.user_id IS NOT NULL AND apcl.audiobook_id IS NULL
            GROUP BY apcl.user_id
            ORDER BY total_views DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.user_id,
                us.user_name,
                us.full_name,
                us.address,
                COUNT(apcl.user_id) AS total_views,
                us.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
            WHERE
                apcl.user_id IS NOT NULL AND apcl.audiobook_id IS NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
            GROUP BY apcl.user_id
            ORDER BY total_views DESC;`;
      }
      const result = await DB.query(sql);
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

  topUsersAudiobook = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
                sql = `SELECT 
                apcl.user_id,
                us.user_name,
                us.full_name,
                us.address,
                COUNT(apcl.user_id) AS total_views,
                us.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
            WHERE
                apcl.user_id IS NOT NULL AND apcl.episode_id IS NULL
            GROUP BY apcl.user_id
            ORDER BY total_views DESC;`;
      } else {
                sql =
          `SELECT 
                apcl.user_id,
                us.user_name,
                us.full_name,
                us.address,
                COUNT(apcl.user_id) AS total_views,
                us.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
            WHERE
                apcl.user_id IS NOT NULL AND apcl.episode_id IS NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
            GROUP BY apcl.user_id
            ORDER BY total_views DESC;`;
      }
      const result = await DB.query(sql);
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

  top10Users = async (startDate, endDate) => {
    try {
      var sql;
      if (startDate == null || endDate == null) {
        return "No Start Date/End Date specified";
      } else {
                sql =
          `SELECT 
                apcl.user_id,
                us.user_name,
                us.full_name,
                us.address,
                COUNT(apcl.user_id) AS total_views,
                us.created_at
            FROM
            
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
            WHERE
                apcl.user_id IS NOT NULL AND apcl.audiobook_id IS NULL AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'), '%Y-%m-%d') >= "` +
          startDate +
          `") AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'), '%Y-%m-%d') <= "` +
          endDate +
          `")
            GROUP BY apcl.user_id
            ORDER BY total_views DESC
            LIMIT 10;`;
      }
            const result = await DB.query(sql);
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

  topListnerLeaderBoard=async (startDate, endDate,user_id) => {
        try {
      var sql;
      if (startDate == null || endDate == null) {
        return "No Start Date/End Date specified";
      } else {
                sql =`
        SELECT lks.total_streaming_time/3600 as total_streaming_time,u.full_name,u.user_name,lks.user_id,ranking 
          FROM (
              SELECT SUM(ks.streaming_time) AS total_streaming_time,
              RANK() OVER(ORDER BY SUM(ks.streaming_time) DESC ) AS ranking
              ,user_id  
                FROM kabbik_statistics AS ks 
                  WHERE (DATE_FORMAT(CONVERT_TZ(ks.created_at, '+00:00', '+6:00'), '%Y-%m-%d') >= '` +
                  startDate +
                  `') AND
                (DATE_FORMAT(CONVERT_TZ(ks.created_at, '+00:00', '+6:00'), '%Y-%m-%d') <= "` +
                  endDate +
                `")  
                  GROUP BY ks.user_id  
          ) AS lks
          INNER JOIN users AS u ON u.id=lks.user_id  WHERE lks.ranking<=15 OR lks.user_id=?`;
      }
      const result = await DB.query(sql,[user_id]);
            if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e)
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

userListneningHistory=async (user_id) => {
    try {
      var sql;
      
                sql =`
        SELECT COALESCE(SUM(ks.streaming_time), 0) AS total_streaming_time
                FROM kabbik_statistics AS ks
                  WHERE ks.user_id=?`;
      const result = await DB.query(sql,[user_id]);
      if (result) {
        return result.map((row) => ({
          total_streaming_time: Number(row.total_streaming_time || 0),
        }));
      }
      return undefined;
    } catch (e) {
      console.log(e)
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  audioBookPlayCountEpisodeTotal = async (startDate, endDate) => {
    try {
      var sql;

            // console.log("Here"+(DATE_FORMAT(startDate, '%Y%c%d')))
            if (startDate != null && endDate != null && startDate < endDate) {
                sql =
          `SELECT 
                ab.name as audiobook_name, ep.name as episode_name, apcl.created_at, COUNT(apcl.id) AS episode_total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
            WHERE
                apcl.episode_id IS NOT NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)
            GROUP BY apcl.episode_id
            ORDER BY episode_total_played DESC;`;
      } else {
        return undefined;
      }
      const result = await DB.query(sql);
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

  audioBookPlayCountEpisode = async (lastdaysago) => {
    try {
      var sql;
      if (lastdaysago == null) {
                sql = `SELECT
                us.user_name,
                us.phone_no,
                ab.name as audiobook_name,
                ep.name as episode_name,
                apcl.from_channel,
                apcl.audiobook_id,
                apcl.created_at,
                apcl.updated_at
            FROM
                audiobook_play_count_log apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
                where apcl.episode_id is not null 
            ORDER BY apcl.created_at DESC;`;
      } else {
                sql =
          `SELECT
                us.user_name,
                us.phone_no,
                ab.name as audiobook_name,
                ep.name as episode_name,
                apcl.from_channel,
                apcl.audiobook_id,
                apcl.created_at,
                apcl.updated_at
            FROM
                audiobook_play_count_log apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                LEFT JOIN
                audiobooks AS ab ON ab.id = ep.audiobook_id
                where apcl.episode_id is not null AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') > 
                DATE_FORMAT(SUBDATE(NOW(), ` +
          lastdaysago +
          `), '%Y%m%d'))
            ORDER BY apcl.created_at DESC;`;
      }
      const result = await DB.query(sql);
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

  todayTotalSignup = async () => {
    try {
      const sql = `SELECT 
            COUNT(*) as total_signup
        FROM
            users
        WHERE
            (DATE_FORMAT(CONVERT_TZ(users.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  yesterdayTotalSignup = async () => {
    try {
      const sql = `SELECT 
            COUNT(*) as total_signup
        FROM
            users
        WHERE
            (DATE_FORMAT(CONVERT_TZ(users.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  yesterdayTotalPurchase = async () => {
    try {
      const sql = `SELECT 
            SUM(amount) AS total_purchase_amount
        FROM
            payments
        WHERE
            sp_massage = 'Success'
                AND (DATE_FORMAT(CONVERT_TZ(payments.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  todayTotalPurchase = async () => {
    try {
      const sql = `SELECT 
            SUM(amount) AS total_purchase_amount
        FROM
            payments
        WHERE
            sp_massage = 'Success'
                AND (DATE_FORMAT(CONVERT_TZ(payments.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  todayTotalPlayCount = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
      const sql2 = `SELECT 
            COUNT(apcl.id) AS web
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d')) AND apcl.from_channel = 'web';`;
      const result2 = await DB.query(sql2);

      const sql3 = `SELECT 
            COUNT(apcl.id) AS android
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d')) AND apcl.from_channel = 'android';`;
      const result3 = await DB.query(sql3);

      const sql31 = `SELECT 
            COUNT(apcl.id) AS android
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d')) AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
      const result31 = await DB.query(sql31);

      const sql4 = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM 
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
        OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result4 = await DB.query(sql4);

      const sql5 = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result5 = await DB.query(sql5);
      if (result) {
        return {
          total_played: "" + result[0].total_played,
          web: "" + result2[0].web,
          android: "" + result3[0].android,
          not_defined: "" + result31[0].not_defined,
          free: "" + result4[0].total_played,
          paid: "" + result5[0].total_played,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  yesterdayTotalPlayCount = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE
        apcl.episode_id IS Not Null and (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);

      const sql2 = `SELECT 
            COUNT(apcl.id) AS web
        FROM
            audiobook_play_count_log AS apcl
        WHERE
        apcl.episode_id IS Not Null and (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d')) AND apcl.from_channel = 'web';`;
      const result2 = await DB.query(sql2);

      const sql3 = `SELECT 
            COUNT(apcl.id) AS android
        FROM
            audiobook_play_count_log AS apcl
        WHERE
        apcl.episode_id IS Not Null and (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d')) AND apcl.from_channel = 'android';`;
      const result3 = await DB.query(sql3);

      const sql4 = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
        OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
        (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
        '%Y%m%d'));`;
      const result4 = await DB.query(sql4);

      const sql5 = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                '%Y%m%d'))`;
      const result5 = await DB.query(sql5);
      if (result) {
        return {
          total_played: "" + result[0].total_played,
          web: "" + result2[0].web,
          android: "" + result3[0].android,
          free: "" + result4[0].total_played,
          paid: "" + result5[0].total_played,
        };
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  yesterdayTotalPlayCountAudiobook = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE
            apcl.audiobook_id IS NOT NULL
                AND (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  todayTotalPlayCountAudiobook = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE
            apcl.audiobook_id IS NOT NULL
                AND (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  todayTotalPlayCountEpisode = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE
            apcl.episode_id IS NOT NULL
                AND (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  yesterdayTotalPlayCountEpisode = async () => {
    try {
      const sql = `SELECT 
            COUNT(apcl.id) AS total_played
        FROM
            audiobook_play_count_log AS apcl
        WHERE
            apcl.episode_id IS NOT NULL
                AND (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result = await DB.query(sql);
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

  audiobookDownloadLog = async (
    userId,
    audiobookId,
    episodeId,
    fromChannel
  ) => {
    if (!userId) {
      userId = 0;
    }
    if (!fromChannel) {
      fromChannel = "Not Defined";
      // do error stuff
    }

    const insertSql =
      "INSERT INTO audiobook_download_log(user_id, audiobook_id, episode_id, from_channel) VALUES (?, ?, ?,?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [
        userId,
        audiobookId,
        episodeId,
        fromChannel,
      ]);
      if (resultsInsertSql) {
                return resultsInsertSql;
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };

  getAudiobookDownloadLog = async (userId) => {
    if (!userId) {
      userId = 0;
    }
        //audiobook_download_log get data monthwise
    // Query to get the list of audiobooks

    
    const getPurchaseTime = `SELECT * FROM users where id=?`;

    const purchaseTimeQueryResponse = await DB.query(getPurchaseTime, userId);

    const purchaseTime = new Date(purchaseTimeQueryResponse[0].purchase_time);
    // const nextPurchaseTime = new Date(
    //   purchaseTimeQueryResponse[0].next_purchase_time
    // );
    // const packageId = purchaseTimeQueryResponse[0].package_id;
    const currentDate = new Date();

    const difference = currentDate - purchaseTime;
    const days = difference / (1000 * 60 * 60 * 24);
    const daysInMonth = parseInt(days / 30);
    const dateTime = new Date(purchaseTime);

    const startDate = new Date(
      dateTime.setDate(dateTime.getDate() + daysInMonth * 30)
    );
    const endDate = new Date(
      dateTime.setDate(dateTime.getDate() + (daysInMonth + 1) * 30)
    );

    let selectAudiobooksSql;
    let selectCountSql;
    let selectLimitDownload;

    

    if (purchaseTime) {
        // Query to get the total count
    selectCountSql = `
    SELECT COUNT(*) as total_count, DATE_FORMAT(CURRENT_DATE(), '%M, %Y') as month
    FROM audiobook_download_log 
    WHERE user_id = ? 
    AND (created_at BETWEEN ? AND ?)
    `;   
    } else {
      // Query to get the total count
      selectCountSql = `
        SELECT COUNT(*) as total_count, DATE_FORMAT(CURRENT_DATE(), '%M, %Y') as month
        FROM audiobook_download_log 
        WHERE user_id = ? 
        AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `;   
    }
// Query to get audiobook list
    selectAudiobooksSql = `
        SELECT *
        FROM audiobook_download_log 
        WHERE user_id = ? 
            AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `;
         // Query to get the total limit
        selectLimitDownload = `
        SELECT freeLimitCount, premiumLimitCount
        FROM homepage_data 
        WHERE track_key = "episode_limit" AND status = 1
        `;
    
    try {
      const resultSelectAudiobooksSql = await DB.query(selectAudiobooksSql, [
        userId,
      ]);
      const resultSelectCountSql = await DB.query(selectCountSql, [
        userId,
        startDate,
        endDate,
      ]);

      const resultSelectLimitDownload = await DB.query(selectLimitDownload, [
        userId,
      ]);
      if (resultSelectAudiobooksSql) {
        return {
          audiobooks: resultSelectAudiobooksSql,
          total_count: resultSelectCountSql[0].total_count,
          month: resultSelectCountSql[0].month,
          remaining_free_count:
            resultSelectLimitDownload[0].freeLimitCount -
            resultSelectCountSql[0].total_count,
          remaining_premium_count:
            resultSelectLimitDownload[0].premiumLimitCount -
            resultSelectCountSql[0].total_count,
        };
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };

  promotionTracker = async (req) => {
    // if (!userId) {
    //     userId = 0
    //   }
    // if (!fromChannel) {
    //     fromChannel = "Not Defined"
    //     // do error stuff
    //   }

                
    const insertSql =
      "INSERT INTO promotion_track_hits (click_id, company_name, header, user_agent) VALUES (?,?,?,?);";
    try {
      // const resultsInsertSql = await DB.query(insertSql, ["1","2","3","4"]);
      const resultsInsertSql = await DB.query(insertSql, [
        req.query.click_id,
        req.query.company_name,
        JSON.stringify(req.headers),
        req.headers["user-agent"],
      ]);
      if (resultsInsertSql) {
                return resultsInsertSql;
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };

  totalListening = async (startDate, endDate, lifetime) => {
    // if (!userId) {
    //     userId = 0
    //   }
    // if (!fromChannel) {
    //     fromChannel = "Not Defined"
    //     // do error stuff
    //   }
    try {
      var sql;
      if (lifetime == 1) {
        sql = `SELECT 
                count(apcl.id) as total_play
            FROM
                audiobook_play_count_log AS apcl
            WHERE
            apcl.episode_id IS Not Null;`;
      } else if (startDate == null || endDate == null) {
                return "No date range selected";
      } else {
                sql =
          `SELECT 
                count(apcl.id) as total_play
            FROM
                audiobook_play_count_log AS apcl
            WHERE
            apcl.episode_id IS Not Null AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') >= ` +
          startDate +
          `) AND
                (DATE_FORMAT(apcl.created_at, '%Y%m%d') <= ` +
          endDate +
          `)`;
      }
      const result = await DB.query(sql);
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

  promotionAudiobooks = async (req) => {
    // if (!userId) {
    //     userId = 0
    //   }
    // if (!fromChannel) {
    //     fromChannel = "Not Defined"
    //     // do error stuff
    //   }
    const insertSql =
      "Select id, name, description, author_name, thumb_path, play_count from audiobooks where id in (225, 141, 1208, 1215, 99, 1225, 1234, 1127, 1148, 219, 221)";
    try {
      // const resultsInsertSql = await DB.query(insertSql, ["1","2","3","4"]);
      const resultsInsertSql = await DB.query(insertSql);
      if (resultsInsertSql) {
                return resultsInsertSql;
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };
}
module.exports = new KabbikModel();
