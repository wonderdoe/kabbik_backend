const constants = require('./constants')
const coreUtils = require('./core-utils')
const DB = require('../data/db');
const ResponseUtils = require('./res-utils');
const axios = require('axios');

var http = require('follow-redirects').http

module.exports = class SmsNotificationHelper {

    static async sendSMS(msisdn, message) {
        try {
            const url = "https://bulksmsbd.net/api/smsapi?api_key=30ZdrZRd1P1zdFqjqp2i&type=text&number="+msisdn+"&senderid=8809617611745&message="+message
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
            return obj;

        } catch (error) {
            return null

        }
    }
}