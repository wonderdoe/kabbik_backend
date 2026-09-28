const DB = require('../db');
const LoggerError = require('../../utils/logger-error');


class StoreModel {

     getStoreItem = async (req) => {

        try {
            
              const sql = "SELECT * from store where stock != 0";

            const result = await DB.query(sql);
            for(var v of result){
                v.excluded_payment_methods = JSON.parse(v.excluded_payment_methods);
               }
            result.forEach(item => {
                if (item.property) {
                    try {
                        item.property = JSON.parse(item.property);
                    } catch (e) {
                        console.error(`Failed to parse JSON for item id ${item.id}:`, e);
                    }
                }
            });
    
            return result;


        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }

    }

      getAllStoreItem = async (req) => {
        try {
            const userId =  req.query.userId; // Get user ID from request

            // Queries
            const storeQuery = "SELECT * FROM store WHERE stock != 0";
            const courseQuery = `
                 SELECT
                c.*,
                cp.user_id,
                COALESCE(cp.is_purchased, 0) AS is_purchased
            FROM
                course AS c
            LEFT JOIN
                course_purchase_table AS cp
            ON
                c.id = cp.course_id AND cp.user_id = ? WHERE c.is_active = 1`;
            const audioBookQuery = `
                   SELECT ab.name, ab.id, ab.price, ab.thumb_path, ab.price,
                (SELECT 
                        IFNULL(AVG(r.rating), @default_rate)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = ab.id
                ) AS rating 
                FROM audiobooks AS ab 
                WHERE ab.for_rent = 1 
                AND ab.approval_status = 1 
                AND ab.podcast = 0 
                AND ab.deleted = 0  
                ORDER BY id DESC limit 10`;

            // Execute queries in parallel
            const [storeItems, courses, audiobooks] = await Promise.all([
                DB.query(storeQuery),
                DB.query(courseQuery, [userId]),
                DB.query(audioBookQuery),
            ]);

            // Parse JSON properties in store items
            storeItems.forEach(item => {
                if (item.property) {
                    try {
                        item.property = JSON.parse(item.property);
                    } catch (e) {
                        console.error(`Failed to parse JSON for item id ${item.id}:`, e);
                    }
                }
            });
 
            // Return all results
            return {
                store: storeItems,
                course: courses,
                audiobooks: audiobooks
            };

        } catch (e) {
            console.error(e);
            LoggerError.log(e);
            return undefined;
        }
    };    
   
}

module.exports = new StoreModel;