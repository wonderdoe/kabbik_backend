const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');

class AdminModel {
    tableName = 'users';

    findOne = async (params) => {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
            const results = await DB.query(sql, [params[0]]);
            var admin = results[0][0];
            const adminCountObj = results[1][0];
            if (admin) {
                return admin;
            }
            return undefined;
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    update = async (fullname, id) => {
        //const { columnSet, values } = multipleColumnSet(params)

        const sql = `UPDATE ${this.tableName} SET full_name = ? WHERE id = ?`;

        const result = await DB.query(sql, [fullname, id]);

        return result;
    }

}

module.exports = new AudiobookModel;