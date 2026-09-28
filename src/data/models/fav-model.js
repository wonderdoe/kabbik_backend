const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');

class FavModel {
    tableName = 'users_audiobooks';

    findForUserId = async (userId) => {
        try {
            // let sql = `SELECT track_id FROM ${this.tableName} AS UT WHERE user_id = ? INNER JOIN tracks ON UT.track_id = tracks.id`;
            let sql = 'CALL get_user_favorites(?)';
            const results = await DB.query(sql, [userId]);
            if (results) {
                return results[0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    findOne = async (params) => {
        try {
            const sql = 'CALL get_favorite_count(?, ?)';
            const results = await DB.query(sql, [params[0], params[1]]);
            var matchCountObj = results[0][0];
            let key = Object.keys(matchCountObj)[0];
            const is_favorite = matchCountObj[key] > 0 ? true : false;
            const data = {
                track_id: parseInt(params[0]),
                is_favorite: is_favorite
            };
            if (data) {
                return data;
            }
            return undefined;
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    createFav = async (
        audiobookId,
        userId
    ) => {
        try {
            let findFav = `SELECT * FROM users_audiobooks WHERE user_id = ? AND audiobook_id = ?`;
            let findFavResult = await DB.query(findFav, [userId, audiobookId]);
            if (findFavResult.length > 0) {
                return {message: "Already in favorites", status: false};
            }
            const sql = 'CALL create_user_audiobook(?, ?)';
            const results = await DB.query(sql, [userId, audiobookId]);
            var lastRowObj = results[0][0];
            const key = Object.keys(lastRowObj)[0];
            const lastId = lastRowObj[key];
            if (lastId) {
                return lastId;
            }
            return undefined;
        }
        catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    delete = async (audiobookId, userId) => {
        const sql = 'CALL delete_users_audiobooks(?, ?)'
        try {
            const results = await DB.query(sql, [userId, audiobookId])
            const rowCount = coreUtils.getValueForKey(results[0][0])
            return rowCount
        }
        catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
}

module.exports = new FavModel;