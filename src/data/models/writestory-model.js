const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class WritestoryModel {

    getWriterStory = async () => {
        
        try {

            const sql1 = `Select * from story`;

                // let jsResult1;
                const result = await DB.query(sql1);
            if (result) {
                return result;
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    // updateUser = async () => {
        
    //     try {

    //         console.log("1");
    //         const sqlUpdateUser = `UPDATE users SET is_subscribed = ?,  purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

    //         const resultUpdateUser = await DB.query(sqlUpdateUser, [3, 1, 2, 0, 933]);

    //         console.log("1 api");

            
    //         console.log(resultUpdateUser);
    //     var resultUser
    //     const sqlUser = `SELECT * from users WHERE subscription_id = ? AND payment_method = ?`;

    //     resultUser = await DB.query(sqlUser, [1, "niii"]);
    //         console.log("2");
    //         console.log("2 api");
    //         console.log(resultUser);

    //         if (resultUpdateUser) {
    //             console.log(resultUpdateUser);
    //             console.log("3");
    //             return resultUpdateUser;
    //         }
    //         return undefined;
    //     } catch (e) {
            
    //         console.log("4");
    //         console.log(e)
    //         LoggerError.log(e)
    //         return undefined;
    //     }
    // }
    uploadStory = async (req) => {
        let user_ip

        if(req.headers["x-forwarded-for"]){

            user_ip = req.headers["x-forwarded-for"]
        }else{
            
        user_ip = "N/A"
        }
        
        const sql = `INSERT INTO story (name, phone, email, title, category, fileUrl, ip_address) VALUES (?,?,?,?,?,?,?)`;;
        const result = await DB.query(sql, [req.body.name, req.body.phone, req.body.email, req.body.title, req.body.category, req.body.fileUrl, user_ip]);
        // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
        // const result = await DB.query(sql,[id]);
        if (result) {
            //console.log(re)
            // console.log(result[0]);
            return "Success";
        }
        return undefined;
    }
    bookRequest = async (req) => {
        let user_ip

        if(req.headers["x-forwarded-for"]){

            user_ip = req.headers["x-forwarded-for"]
        }else{
            
        user_ip = "N/A"
        }
        
        const sql = `INSERT INTO bookRequest (name, bookname, writer, language, category, ip_address) VALUES (?,?,?,?,?,?)`;;
        const result = await DB.query(sql, [req.body.name, req.body.bookname, req.body.writer, req.body.language, req.body.category, user_ip]);
        // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
        // const result = await DB.query(sql,[id]);
        if (result) {
            //console.log(re)
            // console.log(result[0]);
            return "Success";
        }
        return undefined;
    }    
    
    getBookRequest = async (req) => {
        let user_ip

        const sql = `Select * from bookRequest`;;
        const result = await DB.query(sql);
        // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
        // const result = await DB.query(sql,[id]);
        if (result) {
            //console.log(re)
            // console.log(result[0]);
            return result;
        }
        return undefined;
    }

}

module.exports = new WritestoryModel;