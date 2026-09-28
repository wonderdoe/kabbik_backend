const DB = require('../db');

class UserPreferenceModel {

    createUserPreference = async (payload) => {
        try{
            const sql = `INSERT INTO user_preference (user_id, categories, authors)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          categories = COALESCE(VALUES(categories), categories),
                          authors = COALESCE(VALUES(authors), authors)`;
                                      const results = await DB.query(sql, [payload.user_id, payload.categories?JSON.stringify(payload.categories):null, payload.authors?JSON.stringify(payload.authors):null]);
            return {success: true, message: 'User preference created successfully', data: results };
        }catch(e){
            console.log(e);
            return {success: false, message: 'Error creating user preference' };
        }
        
    }

    updateUserPreference = async (payload) => {
        try{
            const sql = `INSERT INTO user_preference  (user_id,categories,authors) VALUE (?,?,?)`;
            const results = await DB.query(sql, [payload.user_id, payload.categories, payload.authors]);
            return {success: true, message: 'User preference created successfully', data: results };
        }catch(e){
            console.log(e);
            return {success: false, message: 'Error creating user preference' };
        }
        
    }

    getUserWisePreferences = async (payload) => {
        try{
            const sql = `select * from user_preference where user_id = ?`;
            const results = await DB.query(sql, [payload.user_id]);
            return {success: true, message: 'User preference created successfully', data: results };
        }catch(e){
            console.log(e);
            return {success: false, message: 'Error creating user preference' };
        }
        
    }
}

module.exports = new UserPreferenceModel;