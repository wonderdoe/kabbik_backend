
const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');

class GamezopTrackerModel {
  tableName = 'gamezop_traffic';
  table2="gamezop_session_track";


  insertGamezopTraffic = async (type="gamezop", game_category, game_name, user_id) => {
        try {
                        // let sql = `SELECT track_id FROM ${this.tableName} AS UT WHERE user_id = ? INNER JOIN tracks ON UT.track_id = tracks.id`;
            

            const mysql = require("mysql");

            const sql = `
            INSERT INTO gamezop_traffic (game_type, game_category, game_name, user_id)
            VALUES (?, ?, ?, ?)
            `;
            
            const finalQuery = mysql.format(sql, [
              type,
              game_category,
              game_name,
              user_id
            ]);
            
                        
            const results = await DB.query(sql, [
              type,
              game_category,
              game_name,
              user_id
            ]);

            if (results) { 
                return results;
            }
            return undefined;
        }
        catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
   
  }

  
  insertGamezopSessionTrack = async (user_id, score, estimated_revenue, session_duration) => {
    try {
                // let sql = `SELECT track_id FROM ${this.tableName} AS UT WHERE user_id = ? INNER JOIN tracks ON UT.track_id = tracks.id`;
        

        const mysql = require("mysql");

        const sql = `
        INSERT INTO gamezop_session_track (user_id, score, estimated_revenue, session_duration)
        VALUES (?, ?, ?, ?)
        `;
        
        // const finalQuery = mysql.format(sql, [
        //   user_id, ads_viewed_count, estimated_revenue, session_duration
        // ]);
        
        // console.log("Executed Query:", finalQuery);
        
        const results = await DB.query(sql, [
          user_id, score, estimated_revenue, session_duration
        ]);

        if (results) { 
            return results;
        }
        return undefined;
    }
    catch (e) {
        console.log(e);
        LoggerError.log(e)
        return undefined;
    }

  }

}


module.exports = new GamezopTrackerModel;
