const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const GlobalTask = require('../../utils/global-tasker');

const NodeCache = require("node-cache");
const cache = new NodeCache();


class ToffeeModel {


    userRecentAudiobookList = async (req) => {

        try {
            const sqlTrend = `SELECT 
                ab.id,
                ab.name,
                ab.thumb_path,
                apcl.created_at
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                users AS us ON apcl.user_id = us.id
                LEFT JOIN audiobooks as ab on apcl.audiobook_id = ab.id
                Where 
                us.id = ? AND apcl.audiobook_id IS NOT NULL AND ab.podcast != 3
                order by apcl.created_at desc limit 6`;

            const data = await DB.query(sqlTrend, req.query.user_id);
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

    getFreeHomeDataApp = async (req) => {

        try {


            const sql1 = `Select homeDataFree from homepage_data where track_key ="home_data" AND status = 1 AND version = 2`;

            // let jsResult1;
            const result = await DB.query(sql1);
                                    
            const data = JSON.parse(result[0].homeDataFree)

            GlobalTask.insertLogsOptional({
                USERID: "",
                userAction: "HomePage",
                endpoint: "/v2/home",
                forTask: "Homedata Free",
                source: "",
                platform: "",
                user_ip: ""
            })
                .catch(error => {
                    console.error("Error:", error);
                });

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



    getAudiobookDetails = async (params, req, res) => {
        try {
            // console.log(req.origin);
            // console.log("req", req);
            // return;
            // Log task details
            GlobalTask.insertLogsToffeeOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "GetAudiobookDetails",
                endpoint: "/v4/toffee/audiobook//",
                forTask: "Home",
                source: "Toffee",
                platform: "App",
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });

            // Retrieve audiobook details
            const query1 = `
            SELECT
              a.approval_status,
              a.author_name,
              a.banner_path,
              a.category_id,
              a.channel_id,
              a.contributing_artists,
              a.created_at,
              a.deleted,
              a.description,
              a.discount_price,
              a.for_app,
              a.guid,
              a.id,
              a.name,
              a.en_name,
              a.play_count,
              a.podcast,
              a.premium,
              a.price,
              a.publish_year,
              a.thumb_path,
              a.updated_at,
              a.publisher_id,
              c.name AS c_name,
              e.file_name,
              e.file_path
            FROM
              audiobooks AS a
              LEFT JOIN categories AS c ON c.id = a.category_id
              LEFT JOIN episodes AS e ON e.audiobook_id = a.id
            WHERE
              a.id = ? LIMIT 1;
          `;
            const [audiobookDetails] = await DB.query(query1, [params[0]]);

                        //   if (!audiobookDetails[0]) {
            //     return undefined; // Or handle the case when the audiobook is not found
            //   }else{
            //     audiobookDetails[0][0].episodes = []
            //   }

            let audiobook = audiobookDetails;

            // Retrieve average rating and rating count
            const query2 = `
            SELECT
              IFNULL(AVG(r.rating), 5) AS rating,
              IF(COUNT(r.rating) > 0, COUNT(r.rating), 1) AS rating_count
            FROM
              ratings AS r
            WHERE
              r.audiobook_id = ?;
          `;
            const [ratingDetails] = await DB.query(query2, [params[0]]);
            let rate = ratingDetails;
            audiobook.rating = rate.rating;
            audiobook.rating_count = rate.rating_count;

            // Retrieve user rating and review
            const query3 = `
            SELECT
              COALESCE(MIN(ur.rating), 0.0) AS user_rating,
              COALESCE(MIN(ur.review), '') AS review
            FROM
              ratings AS ur
            WHERE
              ur.audiobook_id = ?
              AND ur.user_id = ?
            LIMIT 1;
          `;
            let [userRatingReview] = await DB.query(query3, [params[0], params[1]]);
            userRatingReview = userRatingReview;
            audiobook.user_rating = userRatingReview.user_rating;
            audiobook.review = userRatingReview.review;

            // Check if there is a match in users_audiobooks
            const query4 = `
            SELECT
              EXISTS(
                SELECT *
                FROM users_audiobooks
                WHERE user_id = ? AND audiobook_id = ?
              ) AS MATCH_COUNT;
          `;
            const [audiobookCountObj] = await DB.query(query4, [params[1], params[0]]);
            let key = Object.keys(audiobookCountObj)[0];
            audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;

            // Retrieve episodes for the audiobook
            const query5 = `
            SELECT
              *
            FROM
              episodes
            WHERE
              audiobook_id = ?;
          `;
            const episodes = await DB.query(query5, [params[0]]);
            // const episodesData = await episodes.map((episode) => {
            //     return {
            //         ...episode,
            //         file_path: `https://api.kabbik.com/v3/audiobooks/episodes/${episode.id}/audio`, // Replace getBlobUrl with your function
            //     };
            // });
            audiobook.episodes = episodes;

            if (audiobook) {
                return audiobook;
            }
            return undefined;
        } catch (e) {
            console.log(e);
            LoggerError.log(e);
            return undefined;
        }
    };




    seemoreCategoryWiseFree = async (name, page = 1, pageSize = 10) => {
        try {
            let data = [];
            var sql;
            var countSql;
            var totalPages = 0;
                        if (name == 'ট্রেন্ডিং') {
                countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

                sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
                    (SELECT 
                            IFNULL(AVG(r.rating), 5)
                        FROM
                            ratings AS r
                        WHERE
                            r.audiobook_id = a.id) AS rating
                FROM
                    audiobooks AS a
                WHERE
                    a.podcast = 0 AND a.approval_status = 1
                        AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
                ORDER BY play_count DESC LIMIT ${pageSize} OFFSET ${page};`;

            } else if (name == 'নতুন') {
                countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

                sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
            ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${page};`;

            } else if (name == 'ফ্রি') {

                countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC`;
                sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${page};`;

            } else if (name == 'প্রিমিয়াম') {

                countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC`;

                sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id
        ) AS rating
        FROM
            audiobooks AS a
        WHERE
            a.podcast = 0 AND a.premium = 1 AND a.approval_status = 1
                AND a.deleted = FALSE LIMIT ${pageSize} OFFSET ${page}`;
            } else if (name == 'পডকাস্ট') {

                countSql = `SELECT COUNT(*) as total
                FROM audiobooks AS a
                WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0`;

                sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
            (SELECT 
                    IFNULL(AVG(r.rating), 5)
                FROM
                    ratings AS r
                WHERE
                    r.audiobook_id = a.id
            ) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0 LIMIT ${pageSize} OFFSET ${page};`;
            } else {

                countSql = `SELECT COUNT(*) as total
                            FROM audiobooks AS a
                            WHERE a.approval_status = 1
                                AND a.id IN (
                                    SELECT cs.audiobook_id
                                    FROM categories_audiobooks as cs
                                    WHERE cs.category_id IN (
                                        SELECT categories.id
                                        FROM categories
                                        WHERE categories.name = ?
                                    )
                                ) 
                                AND a.approval_status = 1 
                                AND a.deleted = FALSE 
                                AND a.price = '0' 
                                AND a.premium = 0
                            ORDER BY a.created_at DESC`;

                sql = `SELECT 
                    a.id,
                    a.name,
                    a.description,
                    a.author_name,
                    a.premium,
                    a.thumb_path,
                    a.price,
                    a.play_count,
                    (SELECT 
                            IFNULL(AVG(r.rating), 5)
                        FROM
                            ratings AS r
                        WHERE
                            r.audiobook_id = a.id) AS rating
                FROM
                    audiobooks AS a
                WHERE
                    a.approval_status = 1
                        AND a.id IN (SELECT 
                            cs.audiobook_id
                        FROM
                            categories_audiobooks as cs
                        WHERE
                            cs.category_id IN(
                    SELECT 
                    categories.id
                FROM
                    categories
                WHERE
                    categories.name = ?))  AND a.approval_status = 1 AND a.deleted = FALSE AND a.price = '0' AND a.premium = 0
                    ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${page};`

            }

            const countResult = await DB.query(countSql, [name]);
            const totalCount = countResult[0].total;

            // Calculate total pages
            totalPages = Math.ceil(totalCount / pageSize);

            
                                                const result = await DB.query(sql, [name]);
            if (result) {
                //console.log(re)
                //console.log(result);

                data.push({
                    name: name,
                    totalPages: totalPages,
                    data: result
                });
            }
            if (data && data.length > 0) {
                return data[0];
            }
            return undefined;
        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }


    getHomeTopBannerToffeeFromCache = async (req, res) => {

    
        GlobalTask.insertLogsToffeeOptional({
            USERID: req.currentUser ? req.currentUser.id : "",
            userAction: "GetHomeTopBannerToffeeFromCache",
            endpoint: "v4/toffee/home/top-banner",
            forTask: "SeeMore",
            source: "Toffee",
            platform: "App",
            user_ip: req.user_ip
        })

        // Check if the data exists in the cache
        const homeTopBannerCache = cache.get("homeTopBanner");
        if (homeTopBannerCache) {

                        if (!homeTopBannerCache) {
                return undefined
            }
            return homeTopBannerCache
        } else {
            var homeTopBanner = await this.getHomeTopBannerToffee(req, res);
            cache.set("homeTopBanner", homeTopBanner, 100);

            if (!homeTopBanner) {
                return undefined
            }

                        return homeTopBanner

        }
    }

    getHomeTopBannerToffee = async (userId) => {
        const sqlTrend = `SELECT 
        ab.id,ab.en_name, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.thumb_path,
        ab.isFeatured,
        ab.featured_image,
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
    homepage_data as hd
    left join audiobooks AS ab  on hd.audiobook_id = ab.id
        where hd.track_key = "popular_book_toffee_free" AND hd.status = 1
    GROUP BY ab.id
        ORDER BY hd.id asc;`;
        try {
            await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
            const resultTrend = await DB.query(sqlTrend);
            if (resultTrend) {
                return {
                    data: resultTrend
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getHomeBannerWeb = async (userId) => {

                const sqlTrend = `SELECT 
        ab.id, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.banner_path,
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
        ab.id in (Select audiobook_id from homepage_data Where track_key = "popular_web_book" AND status = 1)
        GROUP BY ab.id
        ORDER BY RAND();`;


        try {
            await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
            const resultTrend = await DB.query(sqlTrend);



            if (resultTrend) {
                return {
                    data: resultTrend
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    getPromoCode = async (userId) => {

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
        ORDER BY RAND();`;


        try {
            await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
            const resultTrend = await DB.query(sqlTrend);



            if (resultTrend) {
                return {
                    data: resultTrend
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getIfPromoActive = async () => {

        try {

            const sql1 = `Select * from homepage_data where track_key ="promo_code" AND status = 1 AND version = 1`;

            // let jsResult1;
            const result = await DB.query(sql1);
            const data = result[0]
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
    getActiveHomeAd = async () => {

        try {

            const sql1 = `Select * from homepage_data where track_key ="home_ad" AND status = 1 AND version = 1`;

            // let jsResult1;
            const result = await DB.query(sql1);
            const data = result
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

    getEpisodeLimit = async () => {

        try {

            const sql1 = `Select * from homepage_data where track_key ="episode_limit" AND status = 1 AND version = 1 limit 1`;

            // let jsResult1;
            const result = await DB.query(sql1);
            const data = result
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



    webGetPromoCodePageData = async (req) => {

        try {

            const sqlPromo = `SELECT * FROM promo as a
            LEFT JOIN subscription_packages as b on a.for_package COLLATE utf8mb4_unicode_ci = b.subscriptionItemId
            where a.for_screen = 'web' AND a.status = 1 `;
            const resultPromo = await DB.query(sqlPromo);

            var default_rate = 5

            const sqlPopularAudiobook = `SELECT 
        a.id,
        a.name,
		a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id
        ) AS rating
        FROM
        audiobooks AS a
        WHERE
        a.id in (1392, 1391, 1390, 1389, 1388, 1387, 1386,1384,1383,1382) ORDER BY play_count DESC
        LIMIT 0 , 10 ;`;
            var popularAudiobookResult;
            try {
                popularAudiobookResult = await DB.query(sqlPopularAudiobook);
                // if (results1) {
                //     popularAudiobookResult = Object.values(JSON.parse(JSON.stringify(results1)));
                // }
            } catch (e) {
                console.log(e);
            }
            // const sqlTop10 = `Select * from promo where for_screen ="web"`;
            // const resultTop10 = await DB.query(sqlTop10);

            // const sqlPromo = `Select * from promo where for_screen ="web"`;
            // const resultPromo = await DB.query(sql1);
            // const data = result
            if (resultPromo.length > 0) {
                resultPromo[0].imageBanner = "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675848796385.jpg"
                resultPromo[1].imageBanner = "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675854373195.png"
                return {
                    popularAudiobookResult: popularAudiobookResult,
                    promo: resultPromo
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    checkPromoCode = async (req, userId, promocode, forPackage) => {
        try {

            const alreadyUsedSql = `SELECT * FROM bkash_invoice WHERE promoCode = ? AND subscribed = ? AND userId = ?`;

            const resultAlreadyUsedSql = await DB.query(alreadyUsedSql, [promocode, "1", userId]);
            if (resultAlreadyUsedSql.length > 0) {
                return undefined
            }

            const sqlPromo = `SELECT * FROM promo WHERE promocode = ? AND for_package = ? AND status = ?`;

            const resultPromo = await DB.query(sqlPromo, [promocode, forPackage, 1]);


            GlobalTask.insertLogsOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "CheckPromoCode",
                endpoint: "/v4/home/checkPromoCode",
                forTask: "PromoCode",
                source: req.query && req.query.source ? req.query.source : "Default",
                platform: req.query && req.query.platform ? req.query.platform : "Default",
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });

            if (resultPromo) {
                return {
                    data: resultPromo[0]
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    getHomeBannerList = async () => {

        try {

            const sql1 = `Select * from home_banner_controller where status = 1 and version = 1`;

            // let jsResult1;
            const result = await DB.query(sql1);
            // const data = JSON.parse(result[0].homeData)
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


    getHomeBannerListV2 = async () => {

        try {

            const sql1 = `Select * from home_banner_controller where status = 1 and version = 2`;

            // let jsResult1;
            const result = await DB.query(sql1);
            // const data = JSON.parse(result[0].homeData)
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

                const sqlTrend = `SELECT 
                ab.id, ab.name, ab.en_name,ab.description,
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
                audiobooks AS ab ON ab.id in (Select audiobook_id from episodes where id = apcl.episode_id )
            WHERE
                apcl.audiobook_id IS NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;


                // await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
                const resultTrend = await DB.query(sqlTrend);

                // console.log("jsResult1[4]")
                data.data.push({
                    name: 'ট্রেন্ডিং',
                    data: resultTrend
                });

                // console.log("jsResult1[3]")
                // data.data.push({
                //     name: 'ট্রেন্ডিং',
                //     data: jsResult1[0]
                // });
                data.data.push({
                    name: 'নতুন',
                    data: jsResult1[1]
                });


                data.data.push({
                    name: 'ফ্রি',
                    data: jsResult1[2]
                });
                // console.log("jsResult1[6]")

                const sql = `SELECT * FROM quiz_controller WHERE status = 1`;
                const result = await DB.query(sql);
                if (result) {
                    // return result;

                    if (result.length > 0) {
                        data.data.push({
                            name: 'কুইজ',
                            dataQuiz: result
                        });
                    }
                }

            }

            // console.log("jsResult1[7]")
            let counter = 0
            const sql2 = `SELECT id FROM categories order by priority asc`;
            const result2 = await DB.query(sql2);
            if (result2) {
                let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)))
                jsResult2.map((el) => {
                    categories.push(el.id);
                });
            }


            // console.log("jsResult1[8]")
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

            }

            // console.log(jsResult1[3])
            data.data.push({
                name: 'পডকাস্ট',
                data: jsResult1[3]
            });
            if (data) {

                // console.log("f")
                const sqlSaveHome = 'Update homepage_data set homeData = ? where track_key = "home_data" and status = 1 and version = 2';
                const resSaveHome = await DB.query(sqlSaveHome, [JSON.stringify(data)]);

                // console.log("e")
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

    getHomeDataNew = async () => {

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

}

module.exports = new ToffeeModel;