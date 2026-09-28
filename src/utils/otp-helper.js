const constants = require('./constants')
const coreUtils = require('./core-utils')
const DB = require('../data/db');
const ResponseUtils = require('./res-utils');
const axios = require('axios');
const OtpModel = require("../data/models/otp-model");
const moment = require('moment');

var http = require('follow-redirects').http

module.exports = class OtpHelper {

    static generateOtp() {
        return coreUtils.generateRandomNumber()
    }

    static async sendOtp(userName, password, msisdn, message, pass, userIpString, refererString, userAgentString, secketKey) {
        //  const sql = `SELECT * FROM otps WHERE  (ip LIKE CONCAT('%', ? '%') OR  msisdn = ?) AND DATE(CONVERT_TZ(created_at, '+00:00', '+6:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+6:00'))`;

        const sql = `SELECT * FROM otps WHERE  msisdn = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+6:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+6:00'))`;

        const results = await DB.query(sql, [msisdn]);
        const updateOtpTable = `UPDATE otps SET b_code = ?, b_message = ? where id = ?`;


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

            var lastInsertId = await OtpModel.create(msisdn, pass, refererString, userIpString, userAgentString, secketKey);
            if (!lastInsertId || lastInsertId < 1) {
                return null
            }
            const url = "https://bulksmsbd.net/api/smsapi?api_key=30ZdrZRd1P1zdFqjqp2i&type=text&number=" + msisdn + "&senderid=8809617611745&message=" + message
            var config = {
                method: 'GET',
                url: url
            };
            const obj = await axios(config).then(function (response) {
                // console.log("dta IT: " + JSON.stringify(response.data))

                // that.addResponseData(JSON.stringify(response.data))
                return response.data
            }).catch(function (error) {
                if (error.response) {
                                        // return checkStatus(error.response.data.errorCode)
                }
            });

            await DB.query(updateOtpTable, [obj.response_code, obj.success_message, lastInsertId]).catch(function (error) {
                if (error.response) {
                                    }
            });
            
            if(obj.response_code != 202){
                return null;
            }

            return obj;

        } catch (error) {
            console.log("errorerrorerrorerror", error)
            return null
        }

    }
}