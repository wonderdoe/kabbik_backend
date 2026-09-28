const constants = require('./constants')
const coreUtils = require('./core-utils')
const DB = require('../data/db');
const ResponseUtils = require('./res-utils');
const axios = require('axios');

var http = require('follow-redirects').http

module.exports = class GlobalTask {

    static async insertLogs(USERID, userAction, endpoint, forTask, source, user_ip) {
        try {
            const insertUserLogs =
                'INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, source, user_ip) VALUES (?, ?, ?, ?, ?, ?);';
            const params = [USERID, userAction, endpoint, forTask, source, user_ip];
            for (let i = 0; i < params.length; i++) {
                if (params[i] === undefined) {
                    params[i] = null;
                }
            }
            return await DB.query(insertUserLogs, params);
        } catch (error) {
            console.log("Failed to insert log")
            return null

        }
    }
    static async insertLogsOptional(options = {}) {
        try {
            const {
                USERID = null,
                userAction = null,
                endpoint = null,
                forTask = null,
                source = null,
                platform = null,
                user_ip = null
            } = options;

            const insertUserLogs =
                'INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, source,platform, user_ip) VALUES (?, ?, ?, ?, ?, ?, ?);';

            const params = [USERID, userAction, endpoint, forTask, source, platform, user_ip];

            return await DB.query(insertUserLogs, params);
        } catch (error) {
            console.log("Failed to insert log:", error);
            return null;
        }
    }    
    
    
    static async insertLogsToffeeOptional(options = {}) {
        try {
            const {
                USERID = null,
                userAction = null,
                endpoint = null,
                forTask = null,
                source = null,
                platform = null,
                user_ip = null
            } = options;

            const insertUserLogs =
                'INSERT INTO toffee_action_logs(USERID, userAction, endpoint, forTask, source,platform, user_ip) VALUES (?, ?, ?, ?, ?, ?, ?);';

            const params = [USERID, userAction, endpoint, forTask, source, platform, user_ip];

            return await DB.query(insertUserLogs, params);
        } catch (error) {
            console.log("Failed to insert log:", error);
            return null;
        }
    }    
    
    static async updateUserLog(options = {}) {
        try {
            const {
                oldUserData = null,
                newUserData = null
            } = options;

            const insertUserLogs =
                'INSERT INTO user_update_log(oldUserData, newUserData) VALUES (?, ?);';

            const params = [oldUserData, newUserData];

            return await DB.query(insertUserLogs, params);
        } catch (error) {
            console.log("Failed to insert log:", error);
            return null;
        }
    }
}