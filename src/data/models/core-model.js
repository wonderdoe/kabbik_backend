const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const fuzz = require('fuzzball');

class CoreModel {
    

    findByIdRole = async (id, role) => {
        const sql = 'CALL find_by_id_role(?, ?)';
        try {
            const results = await DB.query(sql, [id, role]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }


   getFaqContent = async () => {

        try {
            const faqSql = `SELECT cat.id AS category_id,
        cat.cat_name, 
        con.id AS faq_content_id,
        con.question_title,
        con.answer  
        from faq_category AS cat JOIN faq_content AS con 
        ON cat.id = con.faq_cat_id
        WHERE cat.status= 1
        ORDER BY cat.priority `;

            const result = await DB.query(faqSql);
            const groupedData = [];

            const categoryMap = new Map();

            for (const row of result) {
                if (!categoryMap.has(row.category_id)) {
                    const newCategory = {
                        category_id: row.category_id,
                        cat_name: row.cat_name,
                        data: []
                    };
                    categoryMap.set(row.category_id, newCategory);
                    groupedData.push(newCategory);
                }

                categoryMap.get(row.category_id).data.push({
                    faq_content_id: row.faq_content_id,
                    question_title: row.question_title,
                    answer: row.answer
                });
            }

            return groupedData;
        } catch (e) {
            return null;
        }

    }	

  getAnnouncement = async (req) => {
        try {
            const userSql = "SELECT * FROM users WHERE id = ?";
            let isSubscribed = 0;
            if (req.query.userId) {
                try {
                    const user = await DB.query(userSql, [req.query.userId]);
                    isSubscribed = user[0]?.is_subscribed || 0;
                } catch (e) {
                    // fallback to free user if query fails
                    isSubscribed = 0;
                }
            }

            // Determine recipient types to include
            const recipientTypes = isSubscribed === 1
                ? ['SUBSCRIBED_USER', 'ALL']
                : ['FREE_USER', 'ALL'];

            const notificationQuery = `
      SELECT 
        an.id,
        an.action_button_color,
        an.action_button_color_2,
        an.is_gradient_action_button,
        an.title AS n_title,
        an.description AS n_description,
        an.image_url AS n_imageUrl,
        an.arguments AS n_arguments,
        an.is_action_button, 
        an.is_banner_type,
        an.action_button_title AS actionButtonTitle,
        an.goto AS goto_page,
        an.created_at 
      FROM announcement AS an
      WHERE an.status = 1 AND an.recipient_type IN (?, ?) 
      ORDER BY an.created_at DESC
    `;

            const result = await DB.query(notificationQuery, [ 
                ...recipientTypes,
            ]);

            const decodedResultNotifications = result.map(item => ({
                ...item,
                n_arguments: item.n_arguments ? JSON.parse(item.n_arguments) : null,
            }));


             if(decodedResultNotifications.length == 0){
               return null;
             }


            return decodedResultNotifications;
        } catch (e) {
            return null;
        }
    };

  
 getAppNotifications = async (req) => {
        try {
            const userSql = "SELECT * FROM users WHERE id = ?";
            let isSubscribed = 0;
            if (req.query.userId) {
                try {
                    const user = await DB.query(userSql, [req.query.userId]);
                    isSubscribed = user[0]?.is_subscribed || 0;
                } catch (e) {
                    // fallback to free user if query fails
                    isSubscribed = 0;
                }
            }

            // Determine recipient types to include
            const recipientTypes = isSubscribed === 1
                ? ['SUBSCRIBED_USER', 'ALL']
                : ['FREE_USER', 'ALL'];

        const page = parseInt(req.query.page || '1');
       // const limit = parseInt(req.query.limit || '20');
        const limit = 14;
        const offset = (page - 1) * limit;

            const notificationQuery = `
      SELECT 
        an.id,
        an.action_button_color,
        an.action_button_color_2,
        an.is_gradient_action_button,
        an.title AS n_title,
        an.description AS n_description,
        an.image_url AS n_imageUrl,
        an.arguments AS n_arguments,
        an.is_action_button,
        an.type AS n_type,
        an.action_button_title AS actionButtonTitle,
        an.goto AS goto_page,
        an.created_at,
        CASE 
          WHEN red.userId IS NOT NULL THEN 1 
          ELSE 0 
        END AS isRead
      FROM app_notification AS an
      LEFT JOIN app_notification_read AS red 
        ON an.id = red.appNotificationId AND red.userId = ?
      WHERE an.status = 1 AND an.recipient_type IN (?, ?) 
      ORDER BY an.created_at DESC
       LIMIT ? OFFSET ?
    `;

            const result = await DB.query(notificationQuery, [
                req.query.userId,
                ...recipientTypes,
                limit,
                offset
            ]);

            const decodedResultNotifications = result.map(item => ({
                ...item,
                n_arguments: item.n_arguments ? JSON.parse(item.n_arguments) : null,
            }));

            return decodedResultNotifications;
        } catch (e) {
            return null;
        }
    };




    readAppNotification = async (req) => {

        const insertSql = `INSERT INTO app_notification_read (userId, appNotificationId) VALUES (?, ?)`;

        try {
            await DB.query(insertSql, [req.body.userId, req.body.notificationId]);
            return { success: true, message: "successfully inserted" };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return { success: false, message: "Notification already marked as read." };
            } else {
                return null;
            }
        }

    }


     getAppUnreadNotificationCount = async (req) => {

        try {

            const userSql = "SELECT * FROM users WHERE id = ?";
            let isSubscribed = 0;
            if (req.query.userId) {
                try {
                    const user = await DB.query(userSql, [req.query.userId]);
                    isSubscribed = user[0]?.is_subscribed || 0;
                } catch (e) {
                    // fallback to free user if query fails
                    isSubscribed = 0;
                }
            }

            //     const notificationQuery = `SELECT COUNT(*) AS unreadCount FROM app_notification AS an
            // LEFT JOIN app_notification_read AS red 
            //   ON an.id = red.appNotificationId AND red.userId = ?
            // WHERE an.status = 1 AND an.recipient_type IN (?, ?) AND red.userId IS NULL;`;

            const notificationQuery = `SELECT COUNT(*) AS unreadCount
            FROM (
                SELECT an.id
                FROM app_notification AS an
                WHERE an.status = 1
                  AND an.recipient_type IN (?, ?)
                ORDER BY an.id DESC
                LIMIT 15
            ) AS latest
            LEFT JOIN app_notification_read AS red
              ON latest.id = red.appNotificationId AND red.userId = ?
            WHERE red.userId IS NULL;`;


            // Determine recipient types to include
            const recipientTypes = isSubscribed === 1
                ? ['SUBSCRIBED_USER', 'ALL']
                : ['FREE_USER', 'ALL'];

            const result = await DB.query(notificationQuery, [
                ...recipientTypes,
                 req.query.userId
            ]);
            return result[0]["unreadCount"];
        } catch (e) {
            return null;
        }

    }


    findByIdRoleNewAdmin = async (id, role) => {
        const sql = 'CALL find_by_id_role_new_admin(?, ?)';
        try {
            const results = await DB.query(sql, [id, role]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    getAppCombinedData = async () => {
        let data = { data: [] };
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
                ab.id, ab.name,ab.description,
                ab.author_name,
                ab.premium,ab.thumb_path,
                ab.price,
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
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 30), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;

            const resultTrend = await DB.query(sqlTrend);

            data.data.push({ name: 'ট্রেন্ডিং', data: resultTrend });
                data.data.push({ name: 'নতুন', data: jsResult1[1] });
                data.data.push({ name: 'প্রিমিয়াম', data: jsResult1[4] });
		
		// data.data.push({ name: 'ট্রেন্ডিংস', data: jsResult1[0] });
                // data.data.push({ name: 'নতুন', data: jsResult1[1] });
                // data.data.push({ name: '????', data: jsResult1[2] });
                // data.data.push({ name: '??????????????', data: jsResult1[3] });

            }

            const sql2 = `SELECT id FROM categories order by priority asc`;
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
                        //audioBooksCategoryList.push({ category: jsResult3[0], audioBooks: jsResult3[1] });
                        data.data.push({ name: jsResult3[0][0].name, data: jsResult3[1] });
                    }
                }
            }
            
            data.data.push({ name: 'পডকাস্ট', data: jsResult1[3] });
            // //console.log(combineArray);
            if (data) {
                return data;
            }
            return undefined;
        }
        catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getPremiumData = async () => {
        let data = { data: [] };
        let audioBooksCategoryList = [];
        let categories = [];
        const sql1 = `CALL get_premium_data()`;

        try {
            const results1 = await DB.query(sql1);
            
            const sql2 = `SELECT id FROM categories`;
            const result2 = await DB.query(sql2);
            if (result2) {
                let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
                jsResult2.map((el) => {
                    categories.push(el.id);
                });
            }


                const sql3 = 'CALL get_combined_data_by_category_no_limit(?)'
                const results3 = await DB.query(sql3, categories[0]);
                if (results3) {
                    let jsResult3 = Object.values(JSON.parse(JSON.stringify(results3)))
                    if (jsResult3[1].length > 0) {
                        //audioBooksCategoryList.push({ category: jsResult3[0], audioBooks: jsResult3[1] });
                        data.data.push({ name: jsResult3[0][0].name, data: jsResult3[1] });
                    }
                }            // //console.log(combineArray);
            if (data) {
                return data;
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }



    getAppPodcastData = async () => {
            let data = { data: [] };
            let audioBooksCategoryList = [];
            let categories = [];
            const sql1 = `CALL get_podcast_data()`;
    
            try {
                const results1 = await DB.query(sql1);
                
                if (results1) {
                    
                    
                    data.data.push({ name: 'podcast', data: results1[0] });
                }
    
    
                                // //console.log(combineArray);
                if (data) {
                    return data;
                }
                return undefined;
            }
            catch (e) {
                LoggerError.log(e)
                return undefined;
            }
        }

    // getCombinedData = async () => {
    //     const sql = 'CALL get_combined_data()';
    //     try {
    //         const results = await DB.query(sql);
    //         if (results) {
    //             //console.log(results)
    //             return results;
    //         }
    //         return undefined;
    //     }
    //     catch (e) {
    //         LoggerError.log(e)
    //         return undefined;
    //     }
    // }


    getBannerImages = async (
        channelId
    ) => {
        const sql = 'SELECT id, banner_path, premium, price from audiobooks where banner_path IS NOT NULL AND approval_status = 1 AND deleted = 0';
        try {
            const results = await DB.query(sql);
            //console.log(results);
            if (results) {
                return results;
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

  getSearch = async (input) => { 
        const sql = 'CALL search_audiobooks(?)';
        try {
            // Call stored procedure
            let results = await DB.query(sql, [input]);
    
            // Check if stored procedure results are valid
            if (results && results[0].length > 0) {
                return results[0];
            }
    
            // If no results from the stored procedure, execute SOUNDEX query
            const soundexSql = `
                SELECT a.id, a.name, a.author_name, a.contributing_artists, a.thumb_path 
                FROM audiobooks AS a
                WHERE (a.approval_status = TRUE AND a.deleted = FALSE) 
                AND (
                SOUNDEX(a.name) = SOUNDEX(?)
                 OR SOUNDEX(a.en_name) = SOUNDEX(?)
                 )`;
            results = await DB.query(soundexSql, [input, input]);

            
    
            if (results && results.length > 0) {

                const searchQuery = `
                INSERT INTO search_data (keyword, search_count)
                    VALUES (?, 1)
                    ON DUPLICATE KEY UPDATE
                        search_count = search_count + 1;
                `;

                DB.query(searchQuery, [input])
                const fuzzyResults = results.map((item) => {
                    const score = fuzz.ratio(input, item.name);  
                    return { ...item, score };  
                });
    
                 fuzzyResults.sort((a, b) => b.score - a.score);
                    return fuzzyResults;
            }
    
             return undefined;
        } catch (e) {
            LoggerError.log(e);
            return undefined;
        }
    };

    getPopularSearch=async(limit=20)=>{
        try {
            let sql = `SELECT *
            FROM search_data
            WHERE updated_at > CURDATE() - INTERVAL 30 DAY
            ORDER BY search_count DESC
            LIMIT ?;`
            // Call stored procedure
                        let results = await DB.query(sql, [Number(limit)]);
    
             return results;
        } catch (e) {
            LoggerError.log(e);
            return undefined;
        }
    }

    getAudiobookDataForPublisher = async (
        channelId
    ) => {
        const sql = 'CALL get_audiobook_data_for_publisher(?)';
        try {
            const results = await DB.query(sql, [channelId]);
            if (results) {
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
}

module.exports = new CoreModel;