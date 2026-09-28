const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class AcademicModel {

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


    
    CornJobgetHomeDataApp = async () => {
        
    }

    getAppAcademicData = async () => {
        let data = {
            data: []
        };
        let categories = [];


        
        try {


            // console.log("jsResult1[7]")
            let counter = 0
            const sql2 = `SELECT id FROM categories where id in (35,36,37) order by priority asc`;
            const result2 = await DB.query(sql2);
            if (result2) {
                let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
                jsResult2.map((el) => {
                    categories.push(el.id);
                });
            }

            
            // console.log("jsResult1[8]")
            for (let i = 0; i < categories.length; i++) {

                const sql3 = 'CALL get_combined_data_by_category(?)'
                const results3 = await DB.query(sql3, categories[i]);
                if (results3) {
                    let jsResult3 = Object.values(JSON.parse(JSON.stringify(results3)))
                    if (jsResult3[1].length > 0) {
                        //audioBooksCategoryList.push({ category: jsResult3[0], audioBooks: jsResult3[1] });
                        data.data.push({
                            name: jsResult3[0][0].name,
                            data: jsResult3[1]
                        });
                    }
                }
            }

            // console.log(jsResult1[3])
            if (data) {
                return data;
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    
    // getAppAcademicData = async () => {
    //     let data = { data: [] };
    //     let audioBooksCategoryList = [];
    //     let categories = [];
    //     const sql1 = `SELECT  ct.name as category_name, a.id, a.name, a.description,  a.author_name,a.premium, a.thumb_path, a.price, a.play_count, 
    //         (SELECT 
    //             IFNULL(AVG(r.rating), @default_rate)
    //         FROM
    //             ratings AS r
    //         WHERE
    //             r.audiobook_id = a.id
    //     ) AS rating FROM audiobooks AS a left join categories_audiobooks as ca on ca.audiobook_id = a.id left join categories as ct on ct.id = ca.category_id  WHERE a.approval_status = 1 AND a.deleted = FALSE AND ca.category_id in (35,36,37) group by a.id ORDER BY a.created_at DESC;`;

    //     try {
    //         const results1 = await DB.query(sql1);
            
    //         // if (results1) {
                
                
    //         //     data.data.push({ name: 'academic', data: results1 });
    //         // }


    //                         // //console.log(combineArray);
    //         if (results1) {
    //             return results1;
    //         }
    //         return undefined;
    //     }
    //     catch (e) {
    //         LoggerError.log(e)
    //         return undefined;
    //     }
    // }

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

}

module.exports = new AcademicModel;