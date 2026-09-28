const DB = require('../db')
const LoggerError = require('../../utils/logger-error')

class PackageModel {
    tableName = 'packages';

    getAll = async () => {
        const sql = 'CALL get_entities(?)'
        try {
            const results = await DB.query(sql, [this.tableName])
            if (results) {
                return results[0]
            }
            return undefined
        }
        catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }
}

module.exports = new PackageModel