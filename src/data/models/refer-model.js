const DB = require('../db');
const moment = require("moment");

class ReferModel {


  async getClaimHistoryEarning(req) {
    try {

      const userId = req.query.userId;
      let fromDate = req.query.fromDate;
      let toDate = req.query.toDate;
      let status = req.query.status;

      if (!userId) {
        return {
          success: false,
          message: `Data Not Found`,
        };
      }

      const today = moment().format("YYYY-MM-DD");
      const sevenDaysAgo = moment().subtract(7, "days").format("YYYY-MM-DD");

      if (!toDate || !fromDate) {
        fromDate = sevenDaysAgo;
        toDate = today;
      }





      let querySql = `
      SELECT status, feedback, award_type, amount, created_at 
      FROM refer_user_claim_log 
      WHERE deleted = 0 AND user_id = ?
      AND DATE(CONVERT_TZ(created_at, 'UTC', '+06:00'))
      BETWEEN DATE(?) AND DATE(?)
`;



      const queryParams = [userId, fromDate, toDate];

      if (status && status.toUpperCase() !== 'ALL') {
        querySql += ` AND status = ?`;
        queryParams.push(status);
      }

      // ? ORDER BY goes last, after all conditions
      querySql += ` ORDER BY created_at DESC`;

  
      const res = await DB.query(querySql, queryParams);

 
      const parsedData = res.map(row => {
        try {
          return { ...row, feedback: row.feedback ? JSON.parse(row.feedback) : null };
        } catch {
          return { ...row, feedback: null }; // fallback if JSON is invalid
        }
      });

      const summarySql = `
      SELECT 
        COUNT(*) AS totalClaim,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS totalDelivered,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS totalPending
      FROM refer_user_claim_log
      WHERE deleted = 0 
        AND user_id = ?
    `;
      const summary = await DB.query(summarySql, [userId]);

      // if (res.length < 1) {
      //   return {
      //     success: false,
      //     message: `Data Not Found`,
      //   };
      // }


      return {
        success: true,
        message: `Successfully fetch data`,
        data: parsedData,
        summary: summary[0] // overall counts

      };
    } catch (error) {
      console.error("Error inserting earning point for user:", userId, error);
      return {
        success: false,
        message: `Failed to fetch claim history ${error.message || error}`
      };
    }
  }


  async getReferHistory(req) {
    try {

      const userId = req.query.userId;
      let fromDate = req.query.fromDate;
      let toDate = req.query.toDate;
 
      if (!userId) {
        return {
          success: false,
          message: `Data Not Found`,
        };
      }

      const today = moment().format("YYYY-MM-DD");
      const sevenDaysAgo = moment().subtract(7, "days").format("YYYY-MM-DD");

      if (!toDate || !fromDate) {
        fromDate = sevenDaysAgo;
        toDate = today;
      }

      let querySql = `SELECT rl.user_id, 
    rl.referred_user_id, 
    CASE rl.package_id
        WHEN 1 THEN 'মান্থলি'
        WHEN 2 THEN 'হাফ-ইয়ারলি'
        WHEN 3 THEN 'ইয়ারলি'
        WHEN 4 THEN 'ডেইলি'
        ELSE ''
    END AS package_name,
     us.user_name,
     rl.amount,
    rl.created_at FROM refer_earn_log as rl JOIN users as us ON rl.referred_user_id = us.id
WHERE rl.deleted = 0 AND rl.user_id = ? 
AND  DATE(CONVERT_TZ(rl.created_at, 'UTC', '+06:00'))
      BETWEEN DATE(?) AND DATE(?) ORDER BY rl.created_at DESC`;

      const queryParams = [userId, fromDate, toDate];

      const res = await DB.query(querySql, queryParams);

      return {
        success: true,
        message: `Successfully fetch data`,
        data: res
      };
    } catch (error) {
       return {
        success: false,
        message: `Failed to fetch claim history ${error.message || error}`
      };
    }
  }



  async getUserEarning(req) {
    try {
      const querySql = 'SELECT balance_amount FROM refer_user_refer WHERE user_id = ?';
      const res = await DB.query(querySql, [req.query.userId]);

      if (res.length < 1) {
        return {
          success: false,
          message: `Data Not Found`,
        };
      }


      return {
        success: true,
        message: `Successfully fetch data`,
        data: {
          balance_amount: res[0].balance_amount,
          minimum_withdrawal_amount: 1000,
          maximum_withdrawal_amount: 2000
        }
      };
    } catch (error) {
      console.error("Error inserting earning point for user:", userId, error);
      return {
        success: false,
        message: `Failed to fetch user balance ${error.message || error}`
      };
    }
  }


  async insertReferEarnLog(userId, referredUerId, refer_code, amount, packageId) {
    try {
      const insertSql = 'CALL refer_insert_earn_log(?, ?, ?, ?, ?)';
      const res = await DB.query(insertSql, [userId, referredUerId, refer_code, amount, packageId]);
      return res;
    } catch (error) {
      console.error("Error inserting earning point for user:", userId, error);
      return false;
    }
  }


  async requestToClaim(req) {


    try {
      const userId = req.body.userId;
      const amount = req.body.amount;

      const sqlInsertQuery = `CALL refer_claim_request(?,?)`;

      await DB.query(sqlInsertQuery, [userId, amount]);

      return {
        success: true,
        message: "রিওয়ার্ড ক্লেইম সফল হয়েছে। আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।"
      };

    } catch (e) {

      return {
        success: false,
        message: `Failed: ${e.message || e}`
      };

    }

  }

}

module.exports = new ReferModel();


