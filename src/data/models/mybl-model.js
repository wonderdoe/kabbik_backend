const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const GlobalTask = require("../../utils/global-tasker");
const moment = require("moment");
const { Parser } = require("json2csv");
const coreUtils = require("../../utils/core-utils");
const StatusCheck = require("../../utils/status-code-check");
const axios = require("axios");
const path = require("path");
const SftpClient = require("ssh2-sftp-client");

const NodeCache = require("node-cache");
const {
  URL_GRANT_TOKEN_BKASH_ONETIME,
  URL_GET_ACCESS_TOKEN_MYBL,
  URL_POST_TRANSACTION_MYBL,
  MYBL_PARTNER_ID,
  MYBL_PARTNER_API_KEY,
  MYBL_PARTNER_SECRET,
  MYBL_PARTNER_HASH,
} = require("../../utils/constants");
const { generateCryptoHashMybl } = require("../../utils/core-utils");
const cache = new NodeCache();
const fs = require("fs");
const s3HelperAwsMybl = require("../../utils/s3-helper-aws-mybl");
const { upload } = require("../../utils/s3-helper");
const redisClient = require("../../utils/redis-client");
const {
  safeJsonParse,
  safeRedisGet,
  safeRedisSet,
  fetchHomeDataFromMysql,
  isValidHomePayload,
} = require("../../utils/home-cache-utils");
const PaymentHelper = require("../../utils/payment-helper");

class MyblModel {
  //test
  userRecentAudiobookList = async (req) => {
    try {
      const sqlTrend = `SELECT 
                ab.id,
                ab.name,
                ab.thumb_path,
                apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                LEFT JOIN audiobooks as ab on apcl.audiobook_id = ab.id
                Where 
                us.id = ? AND apcl.audiobook_id IS NOT NULL AND ab.podcast != 3
                order by apcl.created_at desc limit 6`;

      const data = await DB.query(sqlTrend, req.query.user_id);
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  postMyblSessionData = async (req) => {
    var {
      userId = "",
      source = "",
      channel = "",
      sessionDuration = "",
      msisdn = "",
    } = req.body;
    var userAgent = req.headers["user-agent"] || "";
    var userIp = req.headers["x-forwarded-for"] || "";
    try {
      const sqlTrend = `INSERT INTO session_logs (userId, user_agent, source, channel, s_duration, msisdn, from_source, user_ip) VALUES (?,?,?,?,?,?,?,?);`;

      const data = await DB.query(sqlTrend, [
        userId,
        userAgent,
        source,
        channel,
        sessionDuration,
        msisdn,
        "Banglalink",
        userIp,
      ]);
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };




   myBlCallBack = async (req) => {

    try {

      const callBackPayload = req.body;
      const statusObj = callBackPayload.requestParam.data.find(item => item.name === "SubscriptionStatus");
      const actionObj = callBackPayload.requestParam.data.find(item => item.name === "action");
      const msisdnObj = callBackPayload.requestParam.data.find(item => item.name === "Msisdn");
      const clientTransObj = callBackPayload.requestParam.data.find(item => item.name === "ClientTransactionId");
      const reasonObj = callBackPayload.requestParam.data.find(item => item.name === "Reason");
      const chargeAmountObj = callBackPayload.requestParam.data.find(item => item.name === "ChargeAmount");


      const sql = `INSERT INTO dcb_webhook (requestId, action, SubscriptionStatus, ClientTransactionId, msisdn, reason, user_agent, request_headers,  bodyResponse, amount, subscriptionOfferID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const userAgent = req.headers["user-agent"] || "User-Agent not available";
      await DB.query(sql, [
        callBackPayload?.requestId,
        actionObj?.value,
        statusObj?.value,
        clientTransObj?.value,
        callBackPayload?.msisdn ? callBackPayload?.msisdn : msisdnObj?.value,
        reasonObj?.value,
        JSON.stringify(userAgent),
        JSON.stringify(req.headers),
        JSON.stringify(callBackPayload),
        chargeAmountObj?.value,
        callBackPayload?.requestParam?.subscriptionOfferID
      ]);


      if (statusObj && statusObj.value === "A") {
        const findUser = `SELECT * FROM dcb_invoice
  WHERE msisdn = RIGHT(?, 10)
  ORDER BY created_at DESC
  LIMIT 1;`;
        const invoice = await DB.query(findUser, [
          callBackPayload?.msisdn ? callBackPayload?.msisdn : msisdnObj?.value
        ]);
        var someDate = new Date();
        var numberOfDaysToAdd = invoice[0].package_id == 1 ? 30
          : invoice[0].package_id == 2 ? 180 : invoice[0].package_id == 3 ? 365 : 1;

        var nextPaymentDateTime = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
        var currentDateTime = new Date().valueOf()

        try {
          const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
          await DB.query(sqlUpdateUser, [true, callBackPayload?.requestParam?.subscriptionOfferID, invoice[0].payment_method, invoice[0].package_id, currentDateTime, nextPaymentDateTime, 0, invoice[0].userId]);
        }
        catch (e) {
          console.log("useeeeeeeeeeeeer update errrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrror", e);
        }

        try {
          const findUsersSql = `SELECT * from users where id = ?`;
          const findUsers = await DB.query(findUsersSql, [
            invoice[0].userId
          ]);

          await PaymentHelper.insertUserPaymentLog(
            invoice[0].userId,
            findUsers[0].user_name,
            findUsers[0].full_name,
            invoice[0].package_id,
            "Banglalink",
            "Subscription",
            invoice[0].payment_method == "DCB_ONE_OFF"? 1 : actionObj?.value == "ACT"? 1 : 0,
            invoice[0].payment_method == "DCB_SUBS"? 1 : 0,
            "SUCCEEDED_PAYMENT",
            1,
            callBackPayload?.msisdn ? callBackPayload?.msisdn : msisdnObj?.value,
            invoice[0].subscription_id,
            chargeAmountObj?.value,
            null,
            0,
             new Date(nextPaymentDateTime)
          );

        } catch (e) {
          console.log("Errrrrrrrrrrrrrror", e)
        }

      }
      else if (statusObj && statusObj.value === "D") {
        const findUser = `SELECT * FROM dcb_invoice WHERE msisdn = RIGHT(?, 10) AND subscription_id = ? ORDER BY created_at DESC LIMIT 1`;
        const invoice = await DB.query(findUser, [
          callBackPayload?.msisdn ? callBackPayload?.msisdn : msisdnObj?.value,
          callBackPayload?.requestParam?.subscriptionOfferID
        ]);
         const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE id = ?`;
        await DB.query(sqlUpdateUser, [1, invoice[0].userId]);
      }
      return {
        "success": true,
        "message": "Successfully received callback."
      };

    } catch (e) {

      console.log("Webhook erfffffffffffffffffffffffffff errrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrror", e);

      return {
        "success": false,
        "message": "Some things went wrong.",
        "error": e
      };
    }
  }





  sendWebhook = async (data) => {
    var {
      userId = "",
      payment_method = "",
      msisdn = "",
      amount = "",
      transaction_id = "",
      transaction_time = "",
      status = "",
      remarks = "",
      reason = "",
      others_data = "",
    } = data;

    try {
      let timestamp = (Date.now() / 1000).toFixed(0);
      transaction_time = moment().format("YYYY-MM-DD HH:mm:ss");
      let generated_partner_hash = generateCryptoHashMybl(
        MYBL_PARTNER_API_KEY,
        timestamp,
        MYBL_PARTNER_SECRET
      );
      var dataAccessToken = {
        "partner-name": MYBL_PARTNER_ID,
        timestamp: timestamp,
      };
      const headersAccessToken = {
        "partner-api-key": MYBL_PARTNER_API_KEY,
        "partner-secret": MYBL_PARTNER_SECRET,
        "partner-hash": generated_partner_hash,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const that = this;
      const urlGetAccessToken = URL_GET_ACCESS_TOKEN_MYBL;
      var config = {
        method: "post",
        url: urlGetAccessToken,
        headers: headersAccessToken,
        data: dataAccessToken,
      };
      const resultAccessToken = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return undefined;
          }
        });
      const headersPostTransaction = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${resultAccessToken.data.access_token}`,
      };
      var postTransactionData = {
        msisdn: msisdn,
        amount: amount,
        transaction_id: transaction_id,
        transaction_time: transaction_time,
        status: status,
        remarks: remarks,
        reason: reason,
        others_data: others_data,
      };

      const urlPostTransaction = URL_POST_TRANSACTION_MYBL;
      var configCreatePayment = {
        method: "post",
        url: urlPostTransaction,
        headers: headersPostTransaction,
        data: postTransactionData,
      };
      const resultPostTransaction = await axios(configCreatePayment)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return checkStatus(error.response.data.errorCode);
          }
        });

      const insertPostTransaction = `
    INSERT INTO mybl_post_transaction (
        userId,
        msisdn,
        amount,
        transaction_id,
        status,
        transaction_time,
        payload,
        payment_method
    ) VALUES (?,?,?,?,?,?,?,?);
`;

      try {
        const resultsInsertPostTransaction = await DB.query(
          insertPostTransaction,
          [
            userId,
            msisdn,
            amount,
            transaction_id,
            status,
            transaction_time,
            JSON.stringify(data) || "",
            payment_method,
          ]
        );
      } catch (error) {
        // Handle any potential errors here
        console.error("Error inserting data into my_table_name:", error);
      }

      return resultPostTransaction;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getFreeHomeDataApp = async (req) => {
    try {
      const data = await fetchHomeDataFromMysql(DB, "homeDataFree");

      GlobalTask.insertLogsOptional({
        USERID: "",
        userAction: "HomePage",
        endpoint: "/v2/home",
        forTask: "Homedata Free",
        source: "",
        platform: "",
        user_ip: "",
      }).catch((error) => {
        console.error("Error:", error);
      });

      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeDataApp = async (req) => {
    try {
      const cached = await safeRedisGet("cache:homeDataMybl");
      let data = safeJsonParse(cached);

      if (!isValidHomePayload(data)) {
        data = await fetchHomeDataFromMysql(DB, "homeDataMybl");
        if (isValidHomePayload(data)) {
          await safeRedisSet("cache:homeDataMybl", JSON.stringify(data));
        }
      }

      GlobalTask.insertLogsOptional({
        USERID: "",
        userAction: "HomePage",
        endpoint: "/v4/mybl/home",
        forTask: "Homedata Mybl",
        source: "",
        platform: "",
        user_ip: "",
      }).catch((error) => {
        console.error("Error:", error);
      });

      if (isValidHomePayload(data)) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAudiobookDetails = async (params, req, res) => {
    try {
                        // return;
      // Log task details
      GlobalTask.insertLogsToffeeOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudiobookDetails",
        endpoint: "/v4/mybl/audiobook/",
        forTask: "Home",
        source: "Banglalink",
        platform: "App",
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });

      
      // Retrieve audiobook details
      const query1 = `
            SELECT
              a.approval_status,
              a.author_name,
              a.banner_path,
              a.category_id,
              a.channel_id,
              a.contributing_artists,
              a.created_at,
              a.deleted,
              a.description,
              a.discount_price,
              a.for_app,
              a.guid,
              a.id,
              a.name,
              a.en_name,
              a.play_count,
              a.podcast,
              a.premium,
              a.price,
              a.publish_year,
              a.thumb_path,
              a.updated_at,
              a.publisher_id,
              c.name AS c_name,
              e.file_name,
              e.file_path
            FROM
              audiobooks AS a
              LEFT JOIN categories AS c ON c.id = a.category_id
              LEFT JOIN episodes AS e ON e.audiobook_id = a.id
            WHERE
              a.id = ? LIMIT 1;
          `;
      const [audiobookDetails] = await DB.query(query1, [params[0]]);

            //   if (!audiobookDetails[0]) {
      //     return undefined; // Or handle the case when the audiobook is not found
      //   }else{
      //     audiobookDetails[0][0].episodes = []
      //   }

      let audiobook = audiobookDetails;

      // Retrieve average rating and rating count
      const query2 = `
            SELECT
              IFNULL(AVG(r.rating), 5) AS rating,
              IF(COUNT(r.rating) > 0, COUNT(r.rating), 1) AS rating_count
            FROM
              ratings AS r
            WHERE
              r.audiobook_id = ?;
          `;
      const [ratingDetails] = await DB.query(query2, [params[0]]);
      let rate = ratingDetails;
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;

      // Retrieve user rating and review
      const query3 = `
            SELECT
              COALESCE(MIN(ur.rating), 0.0) AS user_rating,
              COALESCE(MIN(ur.review), '') AS review
            FROM
              ratings AS ur
            WHERE
              ur.audiobook_id = ?
              AND ur.user_id = ?
            LIMIT 1;
          `;
      let [userRatingReview] = await DB.query(query3, [params[0], params[1]]);
      userRatingReview = userRatingReview;
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;

      // Check if there is a match in users_audiobooks
      const query4 = `
            SELECT
              EXISTS(
                SELECT *
                FROM users_audiobooks
                WHERE user_id = ? AND audiobook_id = ?
              ) AS MATCH_COUNT;
          `;
      const [audiobookCountObj] = await DB.query(query4, [
        params[1],
        params[0],
      ]);
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;

      // Retrieve episodes for the audiobook
      const query5 = `
            SELECT
              *
            FROM
              episodes
            WHERE
              audiobook_id = ?;
          `;
      const episodes = await DB.query(query5, [params[0]]);
      // const episodesData = await episodes.map((episode) => {
      //     return {
      //         ...episode,
      //         file_path: `https://api.kabbik.com/v3/audiobooks/episodes/${episode.id}/audio`, // Replace getBlobUrl with your function
      //     };
      // });
      audiobook.episodes = episodes;

      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  seemoreCategoryWiseFree = async (name, page = 1, pageSize = 10) => {
    try {
      let data = [];
      var sql;
      var countSql;
      var totalPages = 0;
            if (name == "ট্রেন্ডিং") {
        countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

        sql = `SELECT 
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
                    a.podcast = 0 AND a.approval_status = 1
                        AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
                ORDER BY play_count DESC LIMIT ${pageSize} OFFSET ${page};`;
      } else if (name == "নতুন") {
        countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

        sql = `SELECT 
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
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
            ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${page};`;
      } else if (name == "ফ্রি") {
        countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC`;
        sql = `SELECT 
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
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${page};`;
      } else if (name == "প্রিমিয়াম") {
        countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC`;

        sql = `SELECT 
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
                r.audiobook_id = a.id
        ) AS rating
        FROM
            audiobooks AS a
        WHERE
            a.podcast = 0 AND a.premium = 1 AND a.approval_status = 1
                AND a.deleted = FALSE LIMIT ${pageSize} OFFSET ${page}`;
      } else if (name == "পডকাস্ট") {
        countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

        sql = `SELECT 
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
                    r.audiobook_id = a.id
            ) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0 LIMIT ${pageSize} OFFSET ${page};`;
      } else {
        countSql = `SELECT COUNT(*) as total
                            FROM audiobooks AS a
                            WHERE a.approval_status = 1
                                AND a.id IN (
                                    SELECT cs.audiobook_id
                                    FROM categories_audiobooks as cs
                                    WHERE cs.category_id IN (
                                        SELECT categories.id
                                        FROM categories
                                        WHERE categories.name = ?
                                    )
                                ) 
                                AND a.approval_status = 1 
                                AND a.deleted = FALSE 
                                AND a.price = '0' 
                                AND a.premium = 0
                            ORDER BY a.created_at DESC`;

        sql = `SELECT 
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
                        AND a.id IN (SELECT 
                            cs.audiobook_id
                        FROM
                            categories_audiobooks as cs
                        WHERE
                            cs.category_id IN(
                    SELECT 
                    categories.id
                FROM
                    categories
                WHERE
                    categories.name = ?))  AND a.approval_status = 1 AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
                    ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${page};`;
      }

      const countResult = await DB.query(countSql, [name]);
      const totalCount = countResult[0].total;

      // Calculate total pages
      totalPages = Math.ceil(totalCount / pageSize);

                        const result = await DB.query(sql, [name]);
      if (result) {
        //console.log(re)
        //console.log(result);

        data.push({
          name: name,
          totalPages: totalPages,
          data: result,
        });
      }
      if (data && data.length > 0) {
        return data[0];
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeTopBannerToffeeFromCache = async (req, res) => {
    GlobalTask.insertLogsToffeeOptional({
      USERID: req.currentUser ? req.currentUser.id : "",
      userAction: "GetHomeTopBannerToffeeFromCache",
      endpoint: "v4/toffee/home/top-banner",
      forTask: "SeeMore",
      source: "Toffee",
      platform: "App",
      user_ip: req.user_ip,
    });

    // Check if the data exists in the cache
    const homeTopBannerCache = cache.get("homeTopBanner");
    if (homeTopBannerCache) {
            if (!homeTopBannerCache) {
        return undefined;
      }
      return homeTopBannerCache;
    } else {
      var homeTopBanner = await this.getHomeTopBannerToffee(req, res);
      cache.set("homeTopBanner", homeTopBanner, 100);

      if (!homeTopBanner) {
        return undefined;
      }

            return homeTopBanner;
    }
  };

  getHomeTopBannerToffee = async (userId) => {
    const sqlTrend = `SELECT 
        ab.id,ab.en_name, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.thumb_path,
        ab.isFeatured,
        ab.featured_image,
        ab.price,

        ab.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), @default_rate)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = ab.id
        ) AS rating
    FROM
    homepage_data as hd
    left join audiobooks AS ab  on hd.audiobook_id = ab.id
        where hd.track_key = "popular_book_toffee_free" AND hd.status = 1
    GROUP BY ab.id
        ORDER BY hd.id asc;`;
    try {
      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const resultTrend = await DB.query(sqlTrend);
      if (resultTrend) {
        return {
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  // generateDailyReport = async (req) => {
  //     const fileNameLocal = `reports/BL_Audiobook_${moment().subtract(1, 'days').format('YYYYMMDD')}.csv`;
  //     // fs.writeFileSync(fileNameLocal, csv);

  //     // Read from the file
  //     const data = fs.readFileSync(fileNameLocal, 'utf8');
  //     console.log(data);

  //     return data;
  // }

  generateDailyReport = async (req) => {
    var daysAgo = req.body.daysAgo || 1;
    var myblLogDate = moment()
      .subtract(daysAgo, "days")
      .tz("Asia/Dhaka")
      .format("YYYY-MM-DD 00:00:00");
    var myblLogDateEnd = moment()
      .subtract(daysAgo, "days")
      .tz("Asia/Dhaka")
      .format("YYYY-MM-DD 23:59:59");
    myblLogDate = moment(myblLogDate)
      .subtract(6, "hours")
      .format("YYYY-MM-DD HH:mm:ss");
    myblLogDateEnd = moment(myblLogDateEnd)
      .subtract(6, "hours")
      .format("YYYY-MM-DD HH:mm:ss");

        
    // ['Date_Key', 'Msisdn', 'Sessiontime_sec', 'User_Type', 'Gross_Price', 'Discount_Promo_code', 'Subscribe', 'Final_Price'];
    //     const sqlDailyReport = `SELECT DISTINCT
    //     subquery.gmt_plus_6_created_at as Date_Key,
    //     IF(subquery.user_name LIKE '88%', SUBSTRING(subquery.user_name, 3), subquery.user_name) AS Msisdn,
    //     subquery.session_time as Sessiontime_sec,
    //     subquery.user_type as User_Type,
    //     subquery.gross_price as Gross_Price,
    //     subquery.discount as Discount_Promo_code,
    //     subquery.is_subscribed as Subscribe,
    //     subquery.final_price as Final_Price
    // FROM
    //     (SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         user_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'GetAudioBookDetails'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //             AND us.client_secret = 'WLZijzSBpFFjeTp'
    //     GROUP BY us.id UNION SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         kabbik.toffee_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'getHomeDataAppFromCacheMybl'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //     GROUP BY us.id) AS subquery
    //     where subquery.user_name NOT LIKE '%@%'
    //     group by subquery.user_name
    //     ;`;

    //shoheb vai code
    //         const sqlDailyReport = `
    //         SELECT
    //     subquery.gmt_plus_6_created_at AS Date_Key,
    //     IF(subquery.user_name LIKE '88%',
    //         SUBSTRING(subquery.user_name, 3),
    //         subquery.user_name) AS Msisdn,
    //     subquery.session_time AS Sessiontime_sec,
    //     subquery.user_type AS User_Type,
    //     subquery.gross_price AS Gross_Price,
    //     subquery.discount AS Discount_Promo_code,
    //     subquery.is_subscribed AS Subscribe,
    //     subquery.final_price AS Final_Price
    // FROM
    //     (SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         user_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'GetAudioBookDetails'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //             AND us.client_secret = 'WLZijzSBpFFjeTp'
    //     GROUP BY us.id UNION SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         kabbik.toffee_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'getHomeDataAppFromCacheMybl'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //     GROUP BY us.id) AS subquery
    // WHERE
    //     subquery.user_name NOT LIKE '%@%'
    // GROUP BY subquery.user_name
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(sl.created_at, 'UTC', 'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     sl.s_duration AS session_time,
    //     CASE
    //         WHEN us.is_subscribed = 1 THEN 'Paid'
    //         ELSE 'Free'
    //     END AS user_type,
    //     0 AS gross_price,
    //     '' AS discount,
    //     us.is_subscribed,
    //     0 AS final_price
    // FROM
    //     session_logs AS sl
    //         LEFT JOIN
    //     users AS us ON sl.userId = us.id
    // WHERE
    //     sl.created_at > '${myblLogDate}'
    //         AND sl.created_at < '${myblLogDateEnd}'
    // GROUP BY sl.userId
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(bkash_invoice.created_at,
    //                     'UTC',
    //                     'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     0 AS session_time,
    //     'Paid' AS user_type,
    //     sp.rawPrice AS gross_price,
    //     (sp.rawPrice - bkash_invoice.amount) AS discount,
    //     us.is_subscribed,
    //     bkash_invoice.amount AS final_price
    // FROM
    //     bkash_invoice
    //         LEFT JOIN
    //     users AS us ON us.id = bkash_invoice.userId
    //         LEFT JOIN
    //     subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = bkash_invoice.package_id
    // WHERE
    //     source = 'Banglalink' AND subscribed = 1
    //         AND bkash_invoice.created_at > '${myblLogDate}'
    //         AND bkash_invoice.created_at < '${myblLogDateEnd}'
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(bkash_onetime.created_at,
    //                     'UTC',
    //                     'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS Date_Key,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     0 AS session_time,
    //     'Paid' AS user_type,
    //     sp.rawPrice AS gross_price,
    //     (sp.rawPrice - bkash_onetime.amount) AS discount,
    //     us.is_subscribed,
    //     bkash_onetime.amount AS final_price
    // FROM
    //     bkash_onetime
    //         LEFT JOIN
    //     users AS us ON us.id = bkash_onetime.userId
    //         LEFT JOIN
    //     subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = bkash_onetime.packageId
    // WHERE
    //     trafficSource = 'Banglalink'
    //         AND subscribed = 1
    //         AND bkash_onetime.created_at > '${myblLogDate}'
    //         AND bkash_onetime.created_at < '${myblLogDateEnd}'
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(nagad_payment.created_at,
    //                     'UTC',
    //                     'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     0 AS session_time,
    //     'Paid' AS user_type,
    //     sp.rawPrice AS gross_price,
    //     (sp.rawPrice - nagad_payment.amount) AS discount,
    //     us.is_subscribed,
    //     nagad_payment.amount AS final_price
    // FROM
    //     nagad_payment
    //         LEFT JOIN
    //     users AS us ON nagad_payment.userId
    //         LEFT JOIN
    //     subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = nagad_payment.packageId
    // WHERE
    //     nagad_payment.trafficSource = 'Banglalink'
    //         AND nagad_payment.status = 'Success'
    //         AND nagad_payment.created_at > '${myblLogDate}'
    //         AND nagad_payment.created_at < '${myblLogDateEnd}'
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(upay_payment.created_at,
    //                     'UTC',
    //                     'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     0 AS session_time,
    //     'Paid' AS user_type,
    //     sp.rawPrice AS gross_price,
    //     (sp.rawPrice - upay_payment.amount) AS discount,
    //     us.is_subscribed,
    //     upay_payment.amount AS final_price
    // FROM
    //     upay_payment
    //         LEFT JOIN
    //     users AS us ON upay_payment.userId = us.id
    //         LEFT JOIN
    //     subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = upay_payment.packageId
    // WHERE
    //     upay_payment.trafficSource = 'Banglalink'
    //         AND upay_payment.status = 'Success'
    //         AND upay_payment.created_at > '${myblLogDate}'
    //         AND upay_payment.created_at < '${myblLogDateEnd}'
    // UNION SELECT
    //     DATE_FORMAT(CONVERT_TZ(payments.created_at, 'UTC', 'Asia/Dhaka'),
    //             '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%',
    //         SUBSTRING(us.user_name, 3),
    //         us.user_name) AS Msisdn,
    //     0 AS session_time,
    //     'Paid' AS user_type,
    //     sp.rawPrice AS gross_price,
    //     (sp.rawPrice - payments.amount) AS discount,
    //     us.is_subscribed,
    //     payments.amount AS final_price
    // FROM
    //     payments
    //         LEFT JOIN
    //     users AS us ON payments.user_id = us.id
    //         LEFT JOIN
    //     subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = payments.package_id
    // WHERE
    //     payments.trafficSource = 'Banglalink'
    //         AND payments.sp_massage = 'Success'
    //         AND payments.created_at > '${myblLogDate}'
    //         AND payments.created_at < '${myblLogDateEnd}';`;

    //mosaraf code

    const sqlDailyReport = `SELECT DATE_FORMAT(CONVERT_TZ(st.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS Date_Key,
            IF(usr.user_name LIKE '88%', SUBSTRING(usr.user_name, 3), usr.user_name) AS Msisdn,
            0 AS Sessiontime_sec,
             CASE
                  WHEN usr.is_subscribed = 1 THEN 'Paid'
                  ELSE 'Free'
                END AS User_Type,
            0 AS Gross_Price,
            0 AS Discount_Promo_code,
            usr.is_subscribed AS Subscribe,
            0 AS Final_Price 
				FROM stream_session AS st 
				JOIN users AS usr ON usr.id = st.user_id  
				WHERE usr.user_name NOT LIKE '%@%'  AND st.created_at > '${myblLogDate}'
            AND st.created_at < '${myblLogDateEnd}'
            AND usr.client_secret = 'WLZijzSBpFFjeTp'
            group by usr.user_name  
				 
            UNION
				 SELECT 
    DATE_FORMAT(CONVERT_TZ(bw.created_at,
                    'UTC',
                    'Asia/Dhaka'),
            '%Y-%m-%d %H:%i:%s') AS Date_Key,
    IF(us.user_name LIKE '88%',
        SUBSTRING(us.user_name, 3),
        us.user_name) AS Msisdn,
    0 AS Sessiontime_sec,
    'Paid' AS User_Type,
    sp.rawPrice AS Gross_Price,
    (sp.rawPrice - bw.amount) AS Discount_Promo_code,
    1 AS Subscribe,
    bw.amount AS Final_Price
FROM
     bkash_webhook AS bw JOIN bkash_invoice AS bi ON bi.subscriptionRequestId = bw.subscriptionRequestId
         JOIN
    users AS us ON us.id = bi.userId
         JOIN
    subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = bi.package_id
WHERE
    source = 'Banglalink' AND bw.paymentStatus = 'SUCCEEDED_PAYMENT'
        AND us.client_secret = 'WLZijzSBpFFjeTp'
        AND us.user_name NOT LIKE '%@%'
        AND bw.created_at > '${myblLogDate}'
        AND bw.created_at < '${myblLogDateEnd}';`;

    try {
      var resultDailyReport = await DB.query(sqlDailyReport);

      const fields = [
        "Date_Key",
        "Msisdn",
        "Sessiontime_sec",
        "User_Type",
        "Gross_Price",
        "Discount_Promo_code",
        "Subscribe",
        "Final_Price",
      ];
      const parser = new Parser({ fields });
      resultDailyReport = resultDailyReport.map((item) => ({
        ...item,
        Msisdn: String(item.Msisdn),
      }));
      const csv = parser.parse(resultDailyReport);
      const dir = "./reports";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      const fileNameLocal = `reports/BL_Audiobook_${moment()
        .subtract(daysAgo, "days")
        .format("YYYYMMDD")}.csv`;
      fs.writeFileSync(fileNameLocal, csv);
    //  s3HelperAwsMybl.uploadFileToS3(
    //    fileNameLocal,
    //    `BL_Audiobook_${moment()
    //      .subtract(daysAgo, "days")
    //      .format("YYYYMMDD")}.csv`
    //  );


      await this.uploadToMyBlServer(fileNameLocal);


      return {
        fileName: `BL_Audiobook_${moment()
          .subtract(daysAgo, "days")
          .format("YYYYMMDD")}.csv`,
        url: `https://mybl-reports.s3.ap-southeast-1.amazonaws.com/BL_Audiobook_${moment()
          .subtract(daysAgo, "days")
          .format("YYYYMMDD")}.csv`,
      };
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };








  uploadToMyBlServer = async (localFilePath) => {

    const sftpConfig = {
      host: "203.223.93.197",
      port: 434,
      username: "audiobook",
      password: "!=bTs#>So6sW72<lYp="
    }

    const fileName = path.basename(localFilePath);
    const remotePath = `/home/${fileName}`; // ?? upload target directory
            
    const sftp = new SftpClient();
    try {
            await sftp.connect(sftpConfig);

      // upload to remote server
            await sftp.put(localFilePath, remotePath); // upload file to /home

      // cleanup local temp file
      fs.unlinkSync(localFilePath); // delete local file
      this.uploadFileAndNotify(`? BL Dump file uploaded successfully, Location: ${remotePath}`);
          }
    catch (err) {
     this.uploadFileAndNotify(`? BL Dump Upload Failed: ${err.message}`);
    } finally {
      sftp.end();
      return true;
    }
  }


  uploadFileAndNotify = async (message) => {
    try {
      // Your file upload logic
      const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1391674694897238057/YakN_zvYVlXyxU1MBoK9bFc7RcQn8S922fvlrB8hDvFU4Tfk-gIafh9N_RsGMX4aX2JK";
      
      // Send Discord notification
      await axios.post(DISCORD_WEBHOOK_URL, {
        content: message,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error uploading file or sending Discord message:", error.message);
    }
  }



  generateDailyReportCorn = async () => {

    const processName = process.env.name || "primary-kabbik-backend";
    if (processName !== "primary-kabbik-backend") {
            return;
    }

    var myblLogDate = moment()
      .subtract(1, "days")
      .tz("Asia/Dhaka")
      .format("YYYY-MM-DD 00:00:00");
    var myblLogDateEnd = moment()
      .subtract(1, "days")
      .tz("Asia/Dhaka")
      .format("YYYY-MM-DD 23:59:59");
    myblLogDate = moment(myblLogDate)
      .subtract(6, "hours")
      .format("YYYY-MM-DD HH:mm:ss");
    myblLogDateEnd = moment(myblLogDateEnd)
      .subtract(6, "hours")
      .format("YYYY-MM-DD HH:mm:ss");

        
    // ['Date_Key', 'Msisdn', 'Sessiontime_sec', 'User_Type', 'Gross_Price', 'Discount_Promo_code', 'Subscribe', 'Final_Price'];
    //     const sqlDailyReport = `SELECT DISTINCT
    //     subquery.gmt_plus_6_created_at as Date_Key,
    //     IF(subquery.user_name LIKE '88%', SUBSTRING(subquery.user_name, 3), subquery.user_name) AS Msisdn,
    //     subquery.session_time as Sessiontime_sec,
    //     subquery.user_type as User_Type,
    //     subquery.gross_price as Gross_Price,
    //     subquery.discount as Discount_Promo_code,
    //     subquery.is_subscribed as Subscribe,
    //     subquery.final_price as Final_Price
    // FROM
    //     (SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         user_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'GetAudioBookDetails'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //             AND us.client_secret = 'WLZijzSBpFFjeTp'
    //     GROUP BY us.id UNION SELECT
    //         us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //     FROM
    //         kabbik.toffee_action_logs AS tal
    //     LEFT JOIN users AS us ON us.id = tal.USERID
    //     WHERE
    //         tal.userAction = 'getHomeDataAppFromCacheMybl'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //     GROUP BY us.id) AS subquery
    //     where subquery.user_name NOT LIKE '%@%'
    //     group by subquery.user_name
    //     ;`;

    //     const sqlDailyReport = `
    //     SELECT
    //         subquery.gmt_plus_6_created_at AS Date_Key,
    //         IF(subquery.user_name LIKE '88%', SUBSTRING(subquery.user_name, 3), subquery.user_name) AS Msisdn,
    //         subquery.session_time AS Sessiontime_sec,
    //         subquery.user_type AS User_Type,
    //         subquery.gross_price AS Gross_Price,
    //         subquery.discount AS Discount_Promo_code,
    //         subquery.is_subscribed AS Subscribe,
    //         subquery.final_price AS Final_Price
    //     FROM (
    //         SELECT
    //             us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //         FROM
    //             user_action_logs AS tal
    //         LEFT JOIN users AS us ON us.id = tal.USERID
    //         WHERE
    //             tal.userAction = 'GetAudioBookDetails'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //             AND us.client_secret = 'WLZijzSBpFFjeTp'
    //         GROUP BY us.id

    //         UNION

    //         SELECT
    //             us.id,
    //             DATE_FORMAT(CONVERT_TZ(tal.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //             us.user_name,
    //             0 AS session_time,
    //             CASE
    //                 WHEN us.is_subscribed = 1 THEN 'Paid'
    //                 ELSE 'Free'
    //             END AS user_type,
    //             0 AS gross_price,
    //             '' AS discount,
    //             us.is_subscribed,
    //             0 AS final_price
    //         FROM
    //             kabbik.toffee_action_logs AS tal
    //         LEFT JOIN users AS us ON us.id = tal.USERID
    //         WHERE
    //             tal.userAction = 'getHomeDataAppFromCacheMybl'
    //             AND tal.created_at > '${myblLogDate}'
    //             AND tal.created_at < '${myblLogDateEnd}'
    //         GROUP BY us.id
    //     ) AS subquery
    //     WHERE subquery.user_name NOT LIKE '%@%'
    //         group by subquery.user_name

    //     UNION

    //     SELECT
    //         DATE_FORMAT(CONVERT_TZ(sl.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS gmt_plus_6_created_at,
    //     IF(us.user_name LIKE '88%', SUBSTRING(us.user_name, 3), us.user_name) AS Msisdn,
    //         sl.s_duration AS session_time,
    //         CASE
    //             WHEN us.is_subscribed = 1 THEN 'Paid'
    //             ELSE 'Free'
    //         END AS user_type,
    //         0 AS gross_price,
    //         '' AS discount,
    //         us.is_subscribed,
    //         0 AS final_price
    //     FROM
    //         session_logs AS sl
    //     LEFT JOIN users AS us ON sl.userId = us.id
    //     WHERE
    //         sl.created_at > '${myblLogDate}'
    //         AND sl.created_at < '${myblLogDateEnd}'
    //         group by sl.userId

    // ;`;

    const sqlDailyReport = `SELECT DATE_FORMAT(CONVERT_TZ(st.created_at, 'UTC', 'Asia/Dhaka'), '%Y-%m-%d %H:%i:%s') AS Date_Key,
            IF(usr.user_name LIKE '88%', SUBSTRING(usr.user_name, 3), usr.user_name) AS Msisdn,
            0 AS Sessiontime_sec,
             CASE
                  WHEN usr.is_subscribed = 1 THEN 'Paid'
                  ELSE 'Free'
                END AS User_Type,
            0 AS Gross_Price,
            0 AS Discount_Promo_code,
            usr.is_subscribed AS Subscribe,
            0 AS Final_Price 
				FROM stream_session AS st 
				JOIN users AS usr ON usr.id = st.user_id  
				WHERE usr.user_name NOT LIKE '%@%'  AND st.created_at > '${myblLogDate}'
            AND st.created_at < '${myblLogDateEnd}'
            AND usr.client_secret = 'WLZijzSBpFFjeTp'
            group by usr.user_name  
				 
            UNION
				 SELECT 
      
    DATE_FORMAT(CONVERT_TZ(bw.created_at,
                    'UTC',
                    'Asia/Dhaka'),
            '%Y-%m-%d %H:%i:%s') AS Date_Key,
    IF(us.user_name LIKE '88%',
        SUBSTRING(us.user_name, 3),
        us.user_name) AS Msisdn,
    0 AS Sessiontime_sec,
    'Paid' AS User_Type,
    sp.rawPrice AS Gross_Price,
    (sp.rawPrice - bw.amount) AS Discount_Promo_code,
    1 AS Subscribe,
    bw.amount AS Final_Price
FROM
     bkash_webhook AS bw JOIN bkash_invoice AS bi ON bi.subscriptionRequestId = bw.subscriptionRequestId
         JOIN
    users AS us ON us.id = bi.userId
         JOIN
    subscription_packages AS sp ON sp.subscriptionItemId COLLATE utf8mb4_unicode_ci = bi.package_id
WHERE
    source = 'Banglalink' AND bw.paymentStatus = 'SUCCEEDED_PAYMENT'
        AND us.client_secret = 'WLZijzSBpFFjeTp'
        AND us.user_name NOT LIKE '%@%'
        AND bw.created_at > '${myblLogDate}'
        AND bw.created_at < '${myblLogDateEnd}';`;

    try {
      var resultDailyReport = await DB.query(sqlDailyReport);
      const fields = [
        "Date_Key",
        "Msisdn",
        "Sessiontime_sec",
        "User_Type",
        "Gross_Price",
        "Discount_Promo_code",
        "Subscribe",
        "Final_Price",
      ];
      const parser = new Parser({ fields });
      resultDailyReport = resultDailyReport.map((item) => ({
        ...item,
        Msisdn: String(item.Msisdn),
      }));
      const csv = parser.parse(resultDailyReport);
      const dir = "./reports";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      const fileNameLocal = `reports/BL_Audiobook_${moment()
        .subtract(1, "days")
        .format("YYYYMMDD")}.csv`;
      fs.writeFileSync(fileNameLocal, csv);
      s3HelperAwsMybl.uploadFileToS3(
        fileNameLocal,
        `BL_Audiobook_${moment().subtract(1, "days").format("YYYYMMDD")}.csv`
      );
      
     await this.uploadToMyBlServer(fileNameLocal);

      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeBannerWeb = async (userId) => {
        const sqlTrend = `SELECT 
        ab.id, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.banner_path,
        ab.price,

        ab.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), @default_rate)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = ab.id
        ) AS rating
    FROM
        audiobooks AS ab  
    WHERE
        ab.id in (Select audiobook_id from homepage_data Where track_key = "popular_web_book" AND status = 1)
        GROUP BY ab.id
        ORDER BY RAND();`;

    try {
      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const resultTrend = await DB.query(sqlTrend);

      if (resultTrend) {
        return {
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  getPromoCode = async (userId) => {
        const sqlTrend = `SELECT 
        ab.id, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.thumb_path,
        ab.price,

        ab.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), @default_rate)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = ab.id
        ) AS rating
    FROM
        audiobooks AS ab  
    WHERE
        ab.id in (Select audiobook_id from homepage_data Where track_key = "popular_book" AND status = 1)
        GROUP BY ab.id
        ORDER BY RAND();`;

    try {
      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const resultTrend = await DB.query(sqlTrend);

      if (resultTrend) {
        return {
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getIfPromoActive = async () => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="promo_code" AND status = 1 AND version = 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = result[0];
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  getActiveHomeAd = async () => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="home_ad" AND status = 1 AND version = 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = result;
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getEpisodeLimit = async () => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="episode_limit" AND status = 1 AND version = 1 limit 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = result;
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  webGetPromoCodePageData = async (req) => {
    try {
      const sqlPromo = `SELECT * FROM promo as a
            LEFT JOIN subscription_packages as b on a.for_package COLLATE utf8mb4_unicode_ci = b.subscriptionItemId
            where a.for_screen = 'web' AND a.status = 1 `;
      const resultPromo = await DB.query(sqlPromo);

      var default_rate = 5;

      const sqlPopularAudiobook = `SELECT 
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
                r.audiobook_id = a.id
        ) AS rating
        FROM
        audiobooks AS a
        WHERE
        a.id in (1392, 1391, 1390, 1389, 1388, 1387, 1386,1384,1383,1382) ORDER BY play_count DESC
        LIMIT 0 , 10 ;`;
      var popularAudiobookResult;
      try {
        popularAudiobookResult = await DB.query(sqlPopularAudiobook);
        // if (results1) {
        //     popularAudiobookResult = Object.values(JSON.parse(JSON.stringify(results1)));
        // }
      } catch (e) {
        console.log(e);
      }
      // const sqlTop10 = `Select * from promo where for_screen ="web"`;
      // const resultTop10 = await DB.query(sqlTop10);

      // const sqlPromo = `Select * from promo where for_screen ="web"`;
      // const resultPromo = await DB.query(sql1);
      // const data = result
      if (resultPromo.length > 0) {
        resultPromo[0].imageBanner =
          "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675848796385.jpg";
        resultPromo[1].imageBanner =
          "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675854373195.png";
        return {
          popularAudiobookResult: popularAudiobookResult,
          promo: resultPromo,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  checkPromoCode = async (req, userId, promocode, forPackage) => {
    try {
      const alreadyUsedSql = `SELECT * FROM bkash_invoice WHERE promoCode = ? AND subscribed = ? AND userId = ?`;

      const resultAlreadyUsedSql = await DB.query(alreadyUsedSql, [
        promocode,
        "1",
        userId,
      ]);
      if (resultAlreadyUsedSql.length > 0) {
        return undefined;
      }

      const sqlPromo = `SELECT * FROM promo WHERE promocode = ? AND for_package = ? AND status = ?`;

      const resultPromo = await DB.query(sqlPromo, [promocode, forPackage, 1]);

      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "CheckPromoCode",
        endpoint: "/v4/home/checkPromoCode",
        forTask: "PromoCode",
        source: req.query && req.query.source ? req.query.source : "Default",
        platform:
          req.query && req.query.platform ? req.query.platform : "Default",
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });

      if (resultPromo) {
        return {
          data: resultPromo[0],
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  getHomeBannerList = async () => {
    try {
      const sql1 = `Select * from home_banner_controller where status = 1 and version = 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      // const data = JSON.parse(result[0].homeData)
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeBannerListV2 = async () => {
    try {
      const sql1 = `Select * from home_banner_controller where status = 1 and version = 2`;

      // let jsResult1;
      const result = await DB.query(sql1);
      // const data = JSON.parse(result[0].homeData)
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAppCastcrewAudiobookMybl = async (name) => {
    try {
            var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT a.id, a.name, a.description, a.author_name,a.premium, a.thumb_path, a.price, a.play_count, a.mybl_play_count, (SELECT IFNULL(AVG(r.rating), " +
        default_rate +
        ") FROM ratings_mybl AS r WHERE r.audiobook_id = a.id) AS rating FROM audiobooks AS a WHERE a.contributing_artists like '%" +
        name +
        "%' AND  a.approval_status = 1 AND a.deleted = FALSE ORDER BY created_at DESC;";
      const result = await DB.query(sql);
      if (result) {
        //console.log(re)
                return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getByCategoryApp = async (id) => {
    try {
      const sql = "CALL get_audiobook_by_category_mybl(?)";
      const result = await DB.query(sql, [id]);
      if (result) {
        return result[0];
      }
      return undefined;
      s;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  seemoreCategoryWiseMybl = async (name) => {
    try {
      let data = {
        data: [],
      };
      var sql;
            if (name == "ট্রেন্ডিং") {
                        sql = `SELECT 
                ab.id, ab.name, ab.en_name,ab.description,
                ab.author_name,
                ab.premium,ab.thumb_path,
                ab.price,
                ab.mybl_play_count as play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), @default_rate)
                    FROM
                    ratings_mybl AS r
                    WHERE
                        r.audiobook_id = ab.id
                ) AS rating,
                 COUNT(apcl.id) AS total_played
            FROM
            audiobook_play_count_log_mybl AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id in (Select audiobook_id from episodes where id = apcl.episode_id )
            WHERE
                apcl.audiobook_id IS NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 20;`;
      } else if (name == "নতুন") {
                        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        a.mybl_play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                    ratings_mybl AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC LIMIT 20;`;
      } else if (name == "ফ্রি অডিওবুক") {
                        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        a.mybl_play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                    ratings_mybl AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC;`;
      } else if (name == "প্রিমিয়াম") {
                        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        a.mybl_play_count,
        (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
            ratings_mybl AS r
            WHERE
                r.audiobook_id = a.id
        ) AS rating
        FROM
            audiobooks AS a
        WHERE
            a.podcast = 0 AND a.premium = 1 AND a.approval_status = 1
                AND a.deleted = FALSE`;
      } else if (name == "পডকাস্ট") {
                        sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
            a.mybl_play_count,
            (SELECT 
                    IFNULL(AVG(r.rating), 5)
                FROM
                ratings_mybl AS r
                WHERE
                    r.audiobook_id = a.id
            ) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE;`;
      } else {
                        //         sql = `SELECT
        //     a.id,
        //     a.name,
        //     a.description,
        //     a.author_name,
        //     a.premium,
        //     a.thumb_path,
        //     a.price,
        //     (SELECT
        //             IFNULL(AVG(r.rating), 5)
        //         FROM
        //             ratings AS r
        //         WHERE
        //             r.audiobook_id = a.id) AS rating
        // FROM
        //     audiobooks AS a
        // WHERE
        //     a.approval_status = 1
        //         AND a.id IN (SELECT
        //             cs.audiobook_id
        //         FROM
        //             categories_audiobooks as cs
        //         WHERE
        //             cs.category_id IN(SELECT
        //             categories.id
        //         FROM
        //             categories
        //         WHERE
        //             categories.name = ?)) WHERE approval_status = 1 AND deleted = FALSE
        // ORDER BY created_at DESC;`;

        sql = `SELECT 
                    a.id,
                    a.name,
                    a.description,
                    a.author_name,
                    a.premium,
                    a.thumb_path,
                    a.price,
                    a.play_count,
                    a.mybl_play_count,
                    (SELECT 
                            IFNULL(AVG(r.rating), 5)
                        FROM
                        ratings_mybl AS r
                        WHERE
                            r.audiobook_id = a.id) AS rating
                FROM
                    audiobooks AS a
                WHERE
                    a.approval_status = 1
                        AND a.id IN (SELECT 
                            cs.audiobook_id
                        FROM
                            categories_audiobooks as cs
                        WHERE
                            cs.category_id IN(
                    SELECT 
                    categories.id
                FROM
                    categories
                WHERE
                    categories.name = ?))  AND a.approval_status = 1 AND a.deleted = FALSE
                    ORDER BY a.created_at DESC;;`;
      }

            const result = await DB.query(sql, [name]);
      if (result) {
        //console.log(re)
        //console.log(result);

        data.data.push({
          name: "data",
          data: result,
        });
      }
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

  createOrUpdateRating = async (rating, review, audiobookId, userId) => {
    // console.log("rating", rating);
    // console.log("review", review);
    // console.log("audiobookId", audiobookId);
    // console.log("userId", userId);
    const sql = "CALL create_or_update_rating_mybl(?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        rating,
        review,
        audiobookId,
        userId,
      ]);
      if (results) {
        // sp returns extra data, need the first one

                const data = coreUtils.getValueForKey(results[0][0]);
                return data;
      }
    } catch (e) {
      // LoggerError.log(e)
      return undefined;
    }
  };

  getByIdNewReview = async (params) => {
    try {
      const sql =
        "SELECT ku.user_name,ku.full_name, ku.image_url, kr.* FROM kabbik.ratings_mybl as kr join users as ku where kr.user_id = ku.id and kr.audiobook_id = ?  order by kr.updated_at desc";
      const results = await DB.query(sql, [params[0]]);

      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeDataNew = async () => {
    try {
      const sql1 = `Select homeData from homepage_data where track_key ="home_data" AND status = 1 AND version = 2`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = JSON.parse(result[0].homeData);
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
}

module.exports = new MyblModel();
