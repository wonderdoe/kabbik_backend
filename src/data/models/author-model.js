const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class AuthorModel {

    findAuthors = async (limit, page,searchParams) => {
        const sql = `SELECT a.*, COUNT(*) OVER() AS totalCount
                        FROM authors a
                        WHERE a.isActive = 1
                            AND a.deleted = 0
                            AND (
                                ? IS NULL 
                                OR a.name LIKE CONCAT('%', ?, '%') 
                                OR a.en_name LIKE CONCAT('%', ?, '%')
                            )
                        LIMIT ? OFFSET ?`;
        try {
            const results = await DB.query(sql, [searchParams,searchParams,searchParams,Number(limit), (Number(page)-1) * limit]);
            return results;
        } catch (e) {
            LoggerError.log(e)
            return {success:false, message: 'Something went wrong' };
        }
    }
}

module.exports = new AuthorModel;