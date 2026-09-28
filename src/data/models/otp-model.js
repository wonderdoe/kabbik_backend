const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class OtpModel {

    findUpdate = async (msisdn, password) => {
        const sql = 'CALL find_update_otp(?, ?)';
        try {
            const results = await DB.query(sql, [msisdn, password]);
            if (results) {
                // sp returns extra data, need the first one
                const data = results[0][0];
                // get key
                let key = Object.keys(data)[0];
                return data[key];
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    updateAllForNum = async (msisdn) => {
        const sql = 'CALL update_otp_all_for_num(?)'
        try {
            const result = await DB.query(sql, [msisdn])
            if (result) {
                // sp returns extra data, need the first one
                return result
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }


    create = async (msisdn, password, refererString, userIpString, userAgentString, secketKey) => {
        const sql = 'CALL create_otp(?, ?, ?, ?, ?, ?)';
        try {
            const results = await DB.query(sql, [msisdn, password, refererString, userIpString, userAgentString, secketKey]);
            if (results) {
                // sp returns extra data, need the first one
                const data = results[0][0];
                // get key
                let key = Object.keys(data)[0];
                return data[key];
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    otp_blocker = async (msisdn, isBlocked, isBlockTime) => {
        // const sql = 'CALL create_otp(?, ?)';
        try {
            const sql = 'INSERT INTO otp_blocker (msisdn, isBlocked, isBlockTime ) VALUES (?, ?, ?)';
            const results = await DB.query(sql, [msisdn, isBlocked, isBlockTime]);
            if (results) {
                return "Successful"
            } else {
                                return "Failed"
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

   otp_blocker_state = async (req) => {
        try {

            var user_ip = req.headers["x-forwarded-for"];
            var userIpString = user_ip ? JSON.stringify(user_ip) : "N/A";

            var user_agent = req.headers["user-agent"];
            var userAgentString = user_agent ? JSON.stringify(user_agent) : "N/A";

            // const sql = `SELECT * FROM otp_blocker WHERE msisdn = ? AND isDeleted= 0 AND isBlocked = 1 ORDER BY id DESC LIMIT 1`;
            const sql =`SELECT * FROM otp_blocker 
            WHERE msisdn = ? OR ip= ? AND isDeleted= 0 AND isBlocked = 1 
            ORDER BY id DESC LIMIT 1;`
            const isBlock = await DB.query(sql, [req.body.msisdn, user_ip]);
            
            if (isBlock.length > 0) {
                return "failed"
            }
            const sevenDaysOtpCount = `SELECT count(*) as otp_count
            FROM otps AS ot 
            WHERE msisdn = ? AND b_code = '202' AND \`active\` = 1  
            AND DATE(CONVERT_TZ(ot.created_at, '+00:00', '+06:00'))
              BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND CURDATE()`;
            const results = await DB.query(sevenDaysOtpCount, [req.body.msisdn]);

            const userAgentLower = user_agent.toLowerCase();

            const isInvalidUserAgent = !(
                userAgentLower.includes("mozilla") || userAgentLower.includes("dart/")
            );
          
            const isValid = /^8801[3-9][0-9]{8}$/.test(req.body.msisdn);

            if (isInvalidUserAgent || !isValid || results[0].otp_count > 5) {

                const insertIntoBlockTable = `INSERT INTO otp_blocker (msisdn, ip, user_agent, isBlocked ) VALUES (?, ?, ?, ?)`;
                await DB.query(insertIntoBlockTable, [req.body.msisdn, userIpString, userAgentString, 1]);
                return "failed";
            }
            else {
                return "pass";
            }

        } catch (e) {
            console.log("Eerrrrrrrrrrrror ", e)
            return "pass";
        }
    }
}

module.exports = new OtpModel;