const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class SubsPageTrackModel {
    tableName = 'subs_page_visitor_track';

    InsertToSubsPageTracker = async (
        user_id,email,phone,action_type,selected_pack_id,selected_pay_method,track_id
    ) => {
        try {
            const sql = `INSERT INTO subs_page_visitor_track 
            (user_id,email,phone,action_type,selected_pack_id,selected_pay_method,track_id) 
            VALUES(?,?,?,?,?,?,?)`;

            const results = await DB.query(
                sql,
                [user_id,email,phone,action_type,selected_pack_id,selected_pay_method,track_id]
            );

            if (results) {
                return results;
            }
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
}

module.exports = new SubsPageTrackModel;