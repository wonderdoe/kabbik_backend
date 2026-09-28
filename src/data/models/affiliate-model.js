const DB = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const e = require("express");
const { generateRandomNumber } = require("../../utils/core-utils");
const axios = require("axios").default;
const moment = require('moment');
const crypto = require("crypto");




class AffiliateModel {


  generateOtp = () => {
    return generateRandomNumber()
  }

  sendOtp = async (msisdn, message, pass, userIpString, refererString, userAgentString) => {

    const sql = `SELECT * FROM otps WHERE  msisdn = ? AND affiliate_otp = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+6:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+6:00'))`;

    const results = await DB.query(sql, [msisdn, 1]);


    if (results.length > 0) {

      const createdAt = results[results.length - 1].created_at;
      const createdAtMoment = moment.utc(createdAt).add(6, 'hours'); // Adjust for +6 hours
      const currentMoment = moment.utc(); // Gets the current time in UTC
      const timeDifferenceMinutes = currentMoment.diff(createdAtMoment, 'minutes');
      const timeDifferenceSeconds = currentMoment.diff(createdAtMoment, 'seconds');
      var totalSent = results.length;

      if (timeDifferenceMinutes < 2) {
        return {
          "lessthan2m": true,
          "remainingTime": 120 - timeDifferenceSeconds
        };
      }
      else if (totalSent >= 3) {
        return "exceeded";
      }

    }

    try {

      const url = "https://bulksmsbd.net/api/smsapi?api_key=30ZdrZRd1P1zdFqjqp2i&type=text&number=" + msisdn + "&senderid=8809617611745&message=" + message
      var config = {
        method: 'GET',
        url: url
      };
      const obj = await axios(config).then(function (response) {
        return response.data
      }).catch(function (error) {
        if (error.response) {
                  }
      });
             if (obj.response_code != 202) {
        return null;
      }

      const otpInsertSql = `INSERT INTO otps (msisdn, password, refferer, ip, user_agent, affiliate_otp, b_code, b_message) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?)`;
      await DB.query(otpInsertSql, [msisdn, pass, refererString, userIpString, userAgentString, 1, obj.response_code, obj.success_message]);

      return obj;

    } catch (error) {
      console.log("errorerrorerrorerror", error)
      return null

    }

  }


  generateReferralCode(length) {

    return crypto
      .randomBytes(length)
      .toString("base64") // Convert to base64 format
      .replace(/\+/g, "0") // Replace '+' with '0' for URL safety
      .replace(/\//g, "1") // Replace '/' with '1' for URL safety
      .substring(0, length) // Cut to the required length
      .toUpperCase(); // Convert to uppercase
  }

  registration = async (req) => {
    try {
      const { msisdn, fullName, password, requestForgotPassword } = req.body;

      // Check if user already exists
      const checkUserSql = `SELECT id FROM affiliate_user WHERE phone_number = ? LIMIT 1`;
      const usersRes = await DB.query(checkUserSql, [msisdn]);


      if (usersRes.length > 0) {
        if (requestForgotPassword == true) {
          const saltRounds = Number(process.env.SALT_ROUND) || 10;
          const hash = await bcrypt.hash(password, saltRounds);
          await DB.query("UPDATE affiliate_user SET password_hash = ? WHERE id = ?", [hash, usersRes[0].id]);

          return {
            success: true,
            message: 'Password update successful'
          }
        }
        return {
          success: false,
          message: "You already have an account, please try to login"
        };
      }

      // Hash password
      const saltRounds = Number(process.env.SALT_ROUND) || 10;
      const hash = await bcrypt.hash(password, saltRounds);

      const referCode = this.generateReferralCode(7);
      // Insert new user
      const insertSql = `
        INSERT INTO affiliate_user (full_name, password_hash, phone_number, refer_code)
        VALUES (?, ?, ?, ?)
      `;
      await DB.query(insertSql, [fullName, hash, msisdn, referCode]);

      return {
        success: true,
        message: "Registration successful"
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Something went wrong, please try again later"
      };
    }
  };

  login = async (req) => {
    try {
      const { msisdn, password } = req.body;

      const checkUserSql = `SELECT * FROM affiliate_user WHERE phone_number = ? AND status = 1 LIMIT 1`;
      const usersRes = await DB.query(checkUserSql, [msisdn]);
      
      if (!usersRes || usersRes.length < 1) {

        return {
          success: false,
          message: "User not found"
        };
      }

      const isMatch = await bcrypt.compare(password, usersRes[0].password_hash ?? '');
      if (!isMatch) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      const expiresIn = 30 * 24 * 60 * 60;
      // generate JWT
      const token = jwt.sign(
        { user_id: usersRes[0].id, msisdn: usersRes[0].phone_number, full_name: usersRes[0].full_name, aff_code: usersRes[0].refer_code },
        process.env.SECRET_JWT,
        { expiresIn }
      );


      return {
        success: true,
        message: "Login successful",
        token: token
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Something went wrong, please try again later"
      };
    }
  };

   getSubscriptionPackage = async (req) => {
    try {
      const subscriptionPlanSql = `
      SELECT sp.*, (sp.rawPrice * 0.10) as commission, 'subscription_plan' AS product_type 
      FROM subscription_packages AS sp 
      WHERE sp.for_affiliate = 1`;
      const productsRes = await DB.query(subscriptionPlanSql);
      return {
        success: true,
        message: "Successful",
        data: productsRes,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Something went wrong, please try again later"
      };
    }

  }

    withdrawalHistory = async (req) => {
    try {
      if(!req.query.userId ){
       throw new Error("User not found");
      }
      const sql = `
      SELECT *
      FROM affiliate_withdraw_log AS al 
      WHERE al.user_id = ${req.query.userId}`;
      const res = await DB.query(sql);
      return {
        success: true,
        message: "Successful",
        data: res,
      };
    } catch (error) {
      console.log(error)
      return {
        success: false,
        message: error.message || "Something went wrong, please try again later"
      };
    }

  }

  getProducts = async (req) => {
    try {
      const productsSql = `
      SELECT ab.*, (ab.price * 0.15) as commission, 'book' AS product_type 
      FROM audiobooks AS ab 
      WHERE ab.for_affiliate = 1 
        AND ab.deleted = 0 
        AND ab.approval_status = 1 
        AND ab.podcast = 0 
      LIMIT ? OFFSET ?`;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;

      // Audiobooks query
      const productsRes = await DB.query(productsSql, [limit, skip]);


      if (!productsRes || productsRes.length < 1) {
        return {
          success: false,
          message: "Product not found"
        };
      }

      return {
        success: true,
        message: "Successful",
        data: productsRes,
        limit: limit,
        page: page
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Something went wrong, please try again later"
      };
    }
  };



  searchProducts = async (req) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    if (!searchQuery) {
      return {
        success: false,
        message: "Please provide a search query"
      };
    }

    // Search SQL
    const searchSql = `
      SELECT ab.*, (ab.price * 0.15) as commission, 'book' AS product_type
      FROM audiobooks AS ab 
      WHERE ab.for_affiliate = 0
        AND ab.deleted = 0
        AND ab.approval_status = 1
        AND ab.podcast = 0
        AND (ab.name LIKE ? OR ab.author_name LIKE ?)
      LIMIT ? OFFSET ?
    `;

    const sqlParams = [`%${searchQuery}%`, `%${searchQuery}%`, limit, skip];

    const productsRes = await DB.query(searchSql, sqlParams);

    if (!productsRes || productsRes.length < 1) {
      return {
        success: false,
        message: "No products found for your search"
      };
    }

    return {
      success: true,
      message: "Search successful",
      data: productsRes,
      limit: limit,
      page: page
    };

  } catch (error) {
    return {
      success: false,
      message: error.message || "Something went wrong, please try again later"
    };
  }
};


  generateReferLink = async (req) => {
    try {
      const affId = req.query.affId;
      const productId = req.query.productId;
      const productType = req.query.productType;
      const uniqueShortCode = this.generateReferralCode(15);

      let targetUrl;
      const shortUrl = `https://kabbik.com/aff/${uniqueShortCode}`;

      if (productType === 'book') {
        targetUrl = `https://kabbik.com/audiobook/${productId}?affId=${affId}&productId=${productId}&productType=${productType}`;
      } else if (productType === 'subscription_plan') {
        targetUrl = `https://kabbik.com/subscribe?affId=${affId}&productId=${productId}&productType=${productType}`;
      }

      const insetToDb = await DB.query(
        `INSERT INTO affiliate_link_map (short_code, aff_user_ref_code, target_url) VALUES (?, ?, ?)`, [
        uniqueShortCode,
        affId,
        targetUrl
      ]);

      return {
        success: true,
        message: 'successfully generated referlink',
        referShortUrl: shortUrl
      };
    } catch (e) {

      return {
        success: false,
        message: `Failed to generate referlink ${e.message}`,
      }
    }
  }


  redirectToTarget = async (req) => {
    try {
      const { shortCode } = req.body;

      const targetUrlSql = 'SELECT * FROM affiliate_link_map WHERE short_code = ? LIMIT 1';
      const targetUrlRes = await DB.query(targetUrlSql, [shortCode]);

      if (targetUrlRes.length > 0) {
	        return {
          success: true,
          redirectUrl: targetUrlRes[0].target_url,
        };
      }

      throw new Error('Target URL not found');
    } catch (e) {
      return {
        success: false,
        message: `Failed to find target URL: ${e.message || e}`,
      };
    }
  }




  getLeaderboard = async (req) => {
    try {
      let fromDate = req.query.fromDate;
      let toDate = req.query.toDate;
      const userId = req.query.userId;

      if (!userId) {
        return { success: false, message: "Data Not Found" };
      }

      const today = moment().format("YYYY-MM-DD");
      const thirtyDaysAgo = moment().subtract(30, "days").format("YYYY-MM-DD");

      if (!fromDate || !toDate) {
        fromDate = thirtyDaysAgo;
        toDate = today;
      }

      // Convert Dhaka date range to UTC to use index on created_at
      const fromUTC = moment(fromDate + " 00:00:00").utc().format("YYYY-MM-DD HH:mm:ss");
      const toUTC = moment(toDate + " 23:59:59").utc().format("YYYY-MM-DD HH:mm:ss");

      const leaderBoardSql = `
      WITH ranked AS (
        SELECT 
          afu.id AS user_id,
          afu.full_name,
          SUM(al.amount) AS total_earning,
          RANK() OVER (ORDER BY SUM(al.amount) DESC) AS \`rank\`
        FROM affiliate_earn_log AS al
        JOIN affiliate_user AS afu ON al.user_id = afu.id
        WHERE al.created_at BETWEEN ? AND ?
        GROUP BY afu.id
      )
      SELECT *
      FROM ranked
      WHERE \`rank\` <= 10
      UNION ALL
      SELECT *
      FROM ranked
      WHERE user_id = ?
        AND \`rank\` > 10
      ORDER BY \`rank\`;
    `;

      const leaderBoardRes = await DB.query(leaderBoardSql, [fromUTC, toUTC, userId]);

      // Find current user's rank
      const yourRankObj = leaderBoardRes.find(row => row.user_id == userId);
      const yourRank = yourRankObj ? yourRankObj : null;

      return {
        success: true,
        leaderBoardRes: leaderBoardRes,
        yourRank: yourRank
      };

    } catch (e) {
      return { success: false, message: "Something went wrong" };
    }
  };


  requestToWithDraw = async (req) => {
    try {
      const withdrawalAmount = req.body.withdrawalAmount;
      const userId = req.body.userId;
      const res = await DB.query("Call affiliate_withdrawal_request(?,?)", [userId, withdrawalAmount]);
                        if (res && res[0][0].success === 1) {

        return {
          success: true,
          message: "Your withdrawal request is pending. Our team will review it shortly."
        };
      }

      return {
        success: false,
        message: "Your withdrawal request could not be processed."
      };

    } catch (e) {

      return {
        success: false,
        message: "Your withdrawal request could not be processed."
      };
    }
  }


  dashBoardData = async (req) => {
    try {
      const sql = `SELECT 
  au.id AS user_id,
  au.balance_amount AS total_balance,
  COUNT(afl.id) AS n_of_sales,
  COALESCE(SUM(afl.sales_amount), 0) AS total_sales,
  COALESCE(SUM(afl.amount), 0) AS total_commission
FROM 
  affiliate_user AS au
LEFT JOIN 
  affiliate_earn_log AS afl 
    ON afl.user_id = au.id
WHERE 
  au.id = ?
GROUP BY 
  au.id, au.balance_amount;
`;
        if (!req.query.userId) {
        return { success: false, message: "No Data found" };
      }
      const res = await DB.query(sql, [req.query.userId]);

      
      if (res.length < 1) {
        return { success: false, message: "No Data found" };
      }

      return {
        success: true,
        data: res[0]
      };
    }
    catch (e) {
      return { success: false, message: "Something went wrong" };
    }
  }






  otpRequest = async (req) => {
    try {
      var referer = req.headers.referer || req.headers.referrer;
      var user_ip = req.headers["x-forwarded-for"];
      var user_agent = req.headers["user-agent"];
      var refererString = referer ? JSON.stringify(referer) : "N/A";
      var userIpString = user_ip ? JSON.stringify(user_ip) : "N/A";
      var userAgentString = user_agent ? JSON.stringify(user_agent) : "N/A";
    
      const { msisdn, requestForgotPassword } = req.body;


      if (requestForgotPassword === true) {
        const checkUsers = `SELECT * from affiliate_user WHERE phone_number = ? LIMIT 1`;
        const userRes = await DB.query(checkUsers, [msisdn])
        if (userRes.length < 0) {
          return {
            success: false,
            message: 'Account not exsits'
          };
        } else if (userRes[0].status === 0) {
          return {
            success: false,
            message: 'Account approval pending'
          };
        }
      }

      const pass = this.generateOtp();
      const msg = `Kabbik OTP Code is ${pass}`;


      const result = await this.sendOtp(
        msisdn,
        msg,
        pass,
        userIpString,
        refererString,
        userAgentString
      );

      
      if (!result) {
        return {
          success: false,
          message: "Unable to send OTP"
        };
      } else if (result == "exceeded") {
        return {
          success: false,
          message: "Daily OTP limit reached. Try again tomorrow or contact support if needed."
        };
      } else if (result.lessthan2m && result.lessthan2m == true) {
        return {
          success: true,
          remainingTime: result.remainingTime,
        };
      }
      return {
        success: true,
        remainingTime: 118,
      };
    }
    catch (err) {
      return {
        success: false,
        message: "Unable to send OTP"
      };
    }
  }

  otpVerificationRequest = async (req) => {
    try {
      const { msisdn, otp, password, requestForgotPassword } = req.body;

      const findSqlOtp = `SELECT * FROM otps WHERE  msisdn = ? AND password = ? AND active = 1 AND affiliate_otp = 1 ORDER BY id DESC Limit 1`;

      const findOtpRes = await DB.query(findSqlOtp, [msisdn, otp])

      
      if (findOtpRes.length > 0) {
        DB.query(`UPDATE otps SET active = 0 WHERE id = ${findOtpRes[0].id}`);
        const registrationRes = await this.registration(req);
        return registrationRes;

      } else {
        return {
          success: false,
          message: 'Invalied otp'
        }
      }


    }
    catch (e) {
      return {
        success: false,
        message: 'Something went wrong'
      }
    }
  }

}

module.exports = new AffiliateModel();
