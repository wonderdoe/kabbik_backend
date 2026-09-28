const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class CourseModel {

    createCourse = async (req) => {

        try {
             
            var {
                name,
                imageUrl,
                routinePath,
                basePrice,
                offerPrice,
                totalClass, 
                durationHour,
                durationMonth,
                description,
                startDate,
                endDate
            } = req.body;

         const courseInsertQuery = `INSERT INTO course(name, image_url, routine_path, base_price, offer_price, total_class, duration_hour, duration_month, description, start_date, end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;


            // let jsResult1;
            const result = await DB.query(courseInsertQuery, [
                name,
                imageUrl,
                routinePath,
                basePrice,
                offerPrice,
                totalClass, 
                durationHour,
                durationMonth,
                description,
                startDate,
                endDate
            ]);

             if (result) {
                return {
                    "status": true,
                    "message": "course created"
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
     
    getAllCourse = async (req, userId) => {

        try {
            
            const courseSearchQuery = `
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
                        
                        
            // let jsResult1;
            const result = await DB.query(courseSearchQuery, [
                userId
            ]);
            
            for(var v of result){
                v.excluded_payment_methods = JSON.parse(v.excluded_payment_methods);
               }

            return result;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }


 getCourseById = async (req) => {

        try {
            
            const courseSearchQuery = `
            SELECT
                c.*,
                cp.user_id,
                COALESCE(cp.is_purchased, 0) AS is_purchased
            FROM
                course AS c
            LEFT JOIN
                course_purchase_table AS cp
            ON
                c.id = cp.course_id AND cp.user_id = ? where c.id = ?`;
                        
            const result = await DB.query(courseSearchQuery, [
                req.query.userId,
                req.params.id
            ]);
            
            return result[0];
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getPurchasedCourse = async (req, userId) => {

        try {
            
            const courseSearchQuery = `
            SELECT
                c.*,
                cp.user_id,
                COALESCE(cp.is_purchased, 0) AS is_purchased
            FROM
                course AS c
            INNER JOIN 
                course_purchase_table AS cp
            ON
                c.id = cp.course_id AND cp.user_id = ?`;
                        
                        
            // let jsResult1;
            const result = await DB.query(courseSearchQuery, [
                userId
            ]);
            
 

            return result;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

}

module.exports = new CourseModel;