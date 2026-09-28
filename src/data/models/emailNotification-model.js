const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class EmailNotificationModel {

    create = async (email,userId) => {
        const sql = 'Insert into email_notification (email,userId) values (?,?)';
        try {
            const results = await DB.query(sql, [email,userId]);
                        if (results) {
                // sp returns extra data, need the first one
                const data = results[0];
                // get key
                let key = Object.keys(data)[0];
                return data[key];
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    findAll = async () => {
        const sql = 'Select * from email_notification';
        try {
            const results = await DB.query(sql);
                        if (results) {
                // sp returns extra data, need the first one
                const data = results[0];

                // get key
                return data;
            }
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

}

module.exports = new EmailNotificationModel;