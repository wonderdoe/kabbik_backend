const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class CoreModelVersion2 {

    getHomeCombinedDataApp = async () => {

        try {

            const sql1 = `Select homeData from homepage_data where track_key ="home_data" AND status = 1 AND version = 1`;

            // let jsResult1;
            const result = await DB.query(sql1);
            const data = JSON.parse(result[0].homeData)
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
    getHomeCombinedDataAppV2 = async () => {

        try {

            const sql1 = `Select homeData from homepage_data where track_key ="home_data" AND status = 1 AND version = 2`;

            // let jsResult1;
            const result = await DB.query(sql1);
            const data = JSON.parse(result[0].homeData)
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

    CornJobgetHomeCombinedDataApp = async () => {
        let data = {
            data: []
        };
        let audioBooksCategoryList = [];
        let categories = [];


                const sql1 = `CALL get_combined_static_app()`;

        try {
            let jsResult1;
            const results1 = await DB.query(sql1);
            if (results1) {
                jsResult1 = Object.values(JSON.parse(JSON.stringify(results1)));
                // console.log("BBB1: "+jsResult1[0].play_count)
                // console.log("BBB2: "+resultsqlLogCount.total_played)
                //     const sqlLogCount = `SELECT 
                //     COUNT(apcl.id) AS total_played
                // FROM
                //     audiobook_play_count_log AS apcl
                //         LEFT JOIN
                //     audiobooks AS ab ON ab.id = apcl.audiobook_id
                // WHERE
                //     apcl.audiobook_id IS NOT NULL AND apcl.audiobook_id = ?
                // GROUP BY apcl.audiobook_id`

                // const resultsqlLogCount = await DB.query(sqlLogCount, jsResult1[0].id);
                // console.log("BBB1: "+jsResult1[0].play_count)
                // console.log("BBB2: "+resultsqlLogCount.total_played)
                // jsResult1[0].play_count = jsResult1[0].play_count + resultsqlLogCount.total_played
                const sqlTrend = `SELECT 
                ab.id, ab.name,'' as description,
                ab.author_name,
                ab.premium,ab.thumb_path,
                ab.price,

                ab.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), @default_rate)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = ab.id
                ) AS rating,
                 COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id = apcl.audiobook_id
            WHERE
                apcl.audiobook_id IS NOT NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 2), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;


                await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
                const resultTrend = await DB.query(sqlTrend);

                data.data.push({
                    name: 'ট্রেন্ডিং',
                    data: resultTrend
                });
                // data.data.push({ name: 'ট্রেন্ডিং', data: jsResult1[0] });
                data.data.push({
                    name: 'নতুন',
                    data: jsResult1[1]
                });
                data.data.push({
                    name: 'ফ্রি',
                    data: jsResult1[2]
                });
                const sql = `SELECT * FROM quiz_controller WHERE status = 1`;
                const result = await DB.query(sql);
                if (result) {
                    // return result;

                    data.data.push({
                        name: 'কুইজ',
                        dataQuiz: result
                    });
                }

                // data.data.push({ name: 'ট্রেন্ডিংস', data: jsResult1[0] });
                // data.data.push({ name: 'নতুন', data: jsResult1[1] });
                // data.data.push({ name: '????', data: jsResult1[2] });
                // data.data.push({ name: '??????????????', data: jsResult1[3] });

            }

            let counter = 0
            const sql2 = `SELECT id FROM categories order by priority asc`;
            const result2 = await DB.query(sql2);
            if (result2) {
                let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
                jsResult2.map((el) => {
                    categories.push(el.id);
                });
            }

            for (let i = 0; i < categories.length; i++) {


                if (i == 34 || i == 35 || i == 36) {

                }
                else if (i == 16) {
                    data.data.push({
                        name: 'প্রিমিয়াম',
                        data: jsResult1[4]
                    });
                }


                if (i != 34 && i != 35 && i != 36) {
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
                //console.log(categories[i]);

            }

            data.data.push({
                name: 'পডকাস্ট',
                data: jsResult1[3]
            });
            // //console.log(combineArray);
            if (data) {

                const sqlSaveHome = 'Update homepage_data set homeData = ? where track_key = "home_data" and status = 1 and version = 1';
                const resSaveHome = await DB.query(sqlSaveHome, [JSON.stringify(data)]);
                if (resSaveHome) {
                    return resSaveHome
                }
                return undefined;
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getHomeBannerApp = async (userId) => {

                const sqlTrend = `SELECT 
        ab.id, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.thumb_path,
        ab.price,

        ab.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), @default_rate)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = ab.id
        ) AS rating
    FROM
        audiobooks AS ab  
    WHERE
        ab.id in (Select audiobook_id from homepage_data Where track_key = "popular_book" AND status = 1)
        GROUP BY ab.id
        ORDER BY RAND()
        LIMIT 1;`;


        try {
            await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
            const resultTrend = await DB.query(sqlTrend);



            if (resultTrend) {
                return { data: resultTrend };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getCombinedData = async () => {

        let combineArray = [];
        let audioBooksCategoryList = [];
        let categories = [];
        const sql1 = `CALL get_combined_static()`;

        try {
            const results1 = await DB.query(sql1);
            if (results1) {
                let jsResult1 = Object.values(JSON.parse(JSON.stringify(results1)));
                //console.log(jsResult1);
                combineArray.push({
                    new: jsResult1[1]
                });
                combineArray.push({
                    trending: jsResult1[0]
                });
                combineArray.push({
                    premium: jsResult1[2]
                });
                combineArray.push({
                    podcast: jsResult1[3]
                });
                //jjdjdjjdj

            }
            // if (results1) {
            //     let jsResult1 = Object.values(JSON.parse(JSON.stringify(results1)))
            //     combineArray.push({ new: jsResult1 });
            // }

            // const results4 = await DB.query(sql4);
            // if (results4) {
            //     let jsResult4 = Object.values(JSON.parse(JSON.stringify(results4)))
            //     combineArray.push({ trending: jsResult4 });
            // }

            const sql2 = `SELECT * FROM kabbik.categories ORDER BY priority asc`;
            const result2 = await DB.query(sql2);
            if (result2) {
                let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
                jsResult2.map((el) => {
                    categories.push(el.id);
                });
            }

            for (let i = 0; i < categories.length; i++) {
                //console.log(categories[i]);
                const sql3 = 'CALL get_combined_data_by_category(?)'
                const results3 = await DB.query(sql3, categories[i]);
                if (results3) {
                    let jsResult3 = Object.values(JSON.parse(JSON.stringify(results3)))
                    if (jsResult3[1].length > 0) {
                        audioBooksCategoryList.push({
                            category: jsResult3[0],
                            audioBooks: jsResult3[1]
                        });
                    }
                }
            }
            combineArray.push(audioBooksCategoryList)


            //console.log(combineArray);
            if (combineArray) {
                return combineArray;
            }
            return undefined;
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    // getAppCombinedData = async () => {
    //     let data = { data: [] };
    //     let audioBooksCategoryList = [];
    //     let categories = [];
    //     const sql1 = `CALL get_combined_static()`;

    //     try {
    //         const results1 = await DB.query(sql1);
    //         if (results1) {
    //             let jsResult1 = Object.values(JSON.parse(JSON.stringify(results1)));
    //             console.log(jsResult1);
    //             data.data.push({ name: 'ট্রেন্ডিংস', data: jsResult1[0] });
    //             data.data.push({ name: 'নতুন', data: jsResult1[1] });
    //             data.data.push({ name: 'প্র্রিমিয়াম্‌', data: jsResult1[2] });
    //         }

    //         const sql2 = `SELECT id FROM categories`;
    //         const result2 = await DB.query(sql2);
    //         if (result2) {
    //             let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
    //             jsResult2.map((el) => {
    //                 categories.push(el.id);
    //             });
    //         }

    //         for (let i = 0; i < categories.length; i++) {
    //             //console.log(categories[i]);
    //             const sql3 = 'CALL get_combined_data_by_category(?)'
    //             const results3 = await DB.query(sql3, categories[i]);
    //             if (results3) {
    //                 let jsResult3 = Object.values(JSON.parse(JSON.stringify(results3)))
    //                 if (jsResult3[1].length > 0) {
    //                     //audioBooksCategoryList.push({ category: jsResult3[0], audioBooks: jsResult3[1] });
    //                     data.data.push({ name: jsResult3[0][0].name, data: jsResult3[1] });
    //                 }
    //             }
    //         }
    //         // //console.log(combineArray);
    //         if (data) {
    //             return data;
    //         }
    //         return undefined;
    //     }
    //     catch (e) {
    //         LoggerError.log(e)
    //         return undefined;
    //     }
    // }


    postFCMToken = async (user_id, channel, token) => {
        try {
            const searchSql = `SELECT * FROM fcm_token WHERE user_id = ? or token = ?`;

            const sql = `INSERT INTO fcm_token (user_id, channel, token)
                        VALUES (?, ?, ?)`;
                        
             const sqlUpdate = `UPDATE fcm_token SET channel = ?, token = ?, user_id=? WHERE  user_id = ? or token= ? `;

             const searchRes = await DB.query(searchSql, [user_id,token]);
             let result;

             if(searchRes.length > 0){
                 result = await DB.query(sqlUpdate, [channel, token,user_id, user_id,token]);
             }
            else{
                result = await DB.query(sql, [user_id, channel, token]);
            }
            if (result) {
                                return result;
            }
                    } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }


}

module.exports = new CoreModelVersion2;