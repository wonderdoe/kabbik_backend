const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const GlobalTask = require("../../utils/global-tasker");
const redisClient = require("../../utils/redis-client");
const {
  unwrapCallResults,
  safeResultIndex,
  safePushPodcast,
  safePushCategorySection,
  loadCategoryIds,
  persistHomeCronData,
  runWithCronLock,
  logSectionError,
  fetchHomeDataFromMysql,
} = require("../../utils/home-cache-utils");
const { rewriteBackendApiUrl } = require("../../utils/payment-urls");

function asArray(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    let current = value;
    for (let i = 0; i < 10; i++) {
      try {
        current = JSON.parse(current);
      } catch {
        return [];
      }
      if (Array.isArray(current)) return current;
      if (typeof current !== "string") return [];
    }
    return [];
  }
  return [];
}

class HomeModel {
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
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

 getHomeAuthorPublisher = async (req) => {
    try {
      let data = await redisClient.get("cache:author_publisher3");
      const parsed = JSON.parse(data);
      if(parsed?.author?.length){
        return parsed
      }
      const sql1 = ` SELECT bp.id , bp.email, bp.phone,bp.full_name,bp.imageUrl,bp.en_name ,
      RANK() OVER (order by SUM(ab.play_count) DESC) AS ranking, ab.publisher_id 
      FROM audiobooks AS ab JOIN book_publishers AS bp ON bp.id= ab.publisher_id
      WHERE bp.deleted =0 
        GROUP BY ab.publisher_id
      LIMIT 10;`;

      const sql2 =`SELECT
        bp.id,
        bp.name,
        bp.imageUrl,
        bp.en_name,
        ab.author_name,
        COUNT(ab.id) AS total_books,
        RANK() OVER (ORDER BY COUNT(ab.id) DESC) AS ranking
    FROM audiobooks AS ab
    JOIN authors AS bp ON bp.name = ab.author_name
    WHERE bp.isActive = 1
      AND bp.deleted = 0
      AND ab.author_name != ''
      and bp.id!= 120
      and bp.id!=379
      and bp.id!=266
    GROUP BY
        bp.id,
        bp.name,
        bp.imageUrl,
        bp.en_name,
        ab.author_name
    LIMIT 15;`

      // let jsResult1;
      const results =await Promise.all([ 
        DB.query(sql1),
        DB.query(sql2)
      ])
      // const data = JSON.parse(result[0].homeData);
      let author_publisher={};
      author_publisher.author=results[1];
      author_publisher.top_publishers_data=results[0];
      if (author_publisher) {
        redisClient.setEx("cache:author_publisher3",3600, JSON.stringify({...author_publisher,src:'redis'}));
        return author_publisher;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeDataApp = async (req) => {
    try {
      const data = await fetchHomeDataFromMysql(DB, "homeData");

      GlobalTask.insertLogsOptional({
        USERID: "",
        userAction: "HomePage",
        endpoint: "/v2/home",
        forTask: "Homedata",
        source: "",
        platform: "",
        user_ip: "",
      }).catch((error) => {
        console.error("Error:", error);
      });

      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  getHomeBannerApp = async (userId) => {

    // const sqlTrend = `SELECT 
    //     ab.id,ab.en_name, ab.name,ab.description,
    //     ab.author_name,
    //     ab.premium,ab.thumb_path,
    //     ab.price,

    //     ab.play_count,
    //     (SELECT 
    //             IFNULL(AVG(r.rating), @default_rate)
    //         FROM
    //             ratings AS r
    //         WHERE
    //             r.audiobook_id = ab.id
    //     ) AS rating
    // FROM
    //     audiobooks AS ab  
    // WHERE
    //     ab.id in (Select audiobook_id from homepage_data Where track_key = "popular_book" AND status = 1 AND for_app = 1)
    //     GROUP BY ab.id
    //     ORDER BY RAND();`;

    const sqlTrend=`SELECT 
        ab.id,ab.en_name, ab.name,ab.description,
        ab.author_name,
        ab.premium,ab.thumb_path,
        ab.price,
        hd.arguments,
        hd.gotoPage,

        ab.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), @default_rate)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = ab.id
        ) AS rating 
        FROM homepage_data AS hd
        LEFT JOIN audiobooks AS ab ON ab.id=hd.audiobook_id
         Where hd.track_key = "popular_book" AND hd.status = 1 AND hd.for_app = 1`;

    try {
      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const resultTrend = await DB.query(sqlTrend);

      if (resultTrend) {
        return {
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeBannerNew = async (userId) => {
    const sqlTrend = `SELECT 
        ab.id,ab.en_name, ab.name,ab.description,
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

    const heroBannerSql = `Select * from home_banner_controller where status = 1 and version = 2`;

    try {
      await DB.query("SET sql_mode = 'NO_UNSIGNED_SUBTRACTION'");
      const featuredBanner = await DB.query(sqlTrend);
      const heroBanner = await DB.query(heroBannerSql);

      if (featuredBanner && heroBanner) {
        return {
          data: {
            success: true,
            featured_banner: featuredBanner,
            hero_banner: heroBanner,
          },
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getHomeBannerWeb = async () => {
    const sqlTrend = `SELECT 
        ab.id,ab.en_name, ab.name,ab.description,
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
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

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
          data: resultTrend,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getIfPromoActive = async () => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="promo_code" AND status = 1 AND version = 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = result[0];
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getActiveHomeAd = async (userId) => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="home_ad" AND status = 1 AND version = 1`;
      const usrSql = `SELECT * FROM users AS usr WHERE usr.id = ?`;
      var isSubscribed = 0;

      const usr = await DB.query(usrSql, [userId]);
      if (usr.length > 0) {
        isSubscribed = usr[0].is_subscribed;
      }

      const result = await DB.query(sql1);

      const filteredResult =
        isSubscribed === 1
          ? result.filter((item) => item.home_ad_type !== "SUBSCRIPTION")
          : result;

      const data = filteredResult;
      if (data) {
        data[0].arguments = data[0].arguments
          ? JSON.parse(data[0].arguments)
          : null;
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getEpisodeLimit = async () => {
    try {
      const sql1 = `Select * from homepage_data where track_key ="episode_limit" AND status = 1 AND version = 1 limit 1`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = result;
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  webGetPromoCodePageData = async (req) => {
    try {
      const sqlPromo = `SELECT * FROM promo as a
            LEFT JOIN subscription_packages as b on a.for_package COLLATE utf8mb4_unicode_ci = b.subscriptionItemId
            where a.for_screen = 'web' AND a.status = 1 `;
      const resultPromo = await DB.query(sqlPromo);

      var default_rate = 5;

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
        resultPromo[0].imageBanner =
          "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675848796385.jpg";
        resultPromo[1].imageBanner =
          "https://kabbik-ab-bucket.s3.ap-south-1.amazonaws.com/1675854373195.png";
        return {
          popularAudiobookResult: popularAudiobookResult,
          promo: resultPromo,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };


   checkPromoCode = async (req, user_id, promocode, forPackage) => {
    try {
     
    const sql = `
      SELECT 
        'promo' AS type,
        promo_type AS promo_type,
        reduce_price AS reduce_price,
        NULL AS discount,
        promocode AS promocode,
        promoCodeGreetings AS promoCodeGreetings,
        allowedPaymentMethods AS allowedPaymentMethods,
        NULL AS price
      FROM promo
      WHERE promocode = ? AND for_package = ? AND status = ?

      UNION ALL

      SELECT 
        'refer' AS type,
        NULL AS promo_type,
        NULL AS reduce_price,
        NULL AS discount,
        u.refer_code AS promocode,
        'Promo code successfully applied' AS promoCodeGreetings,
        NULL AS allowedPaymentMethods,
        sp.rawPrice AS price
      FROM users u
      JOIN subscription_packages sp ON sp.subscriptionItemId = ?
      WHERE u.refer_code = ?

      UNION ALL

      SELECT 
        'affiliate' AS type,
        NULL AS promo_type,
        NULL AS reduce_price,
        a.discount AS discount,
        a.refer_code AS promocode,
        'Promo code successfully applied' AS promoCodeGreetings,
        NULL AS allowedPaymentMethods,
        sp.rawPrice AS price
      FROM affiliate_user a
      JOIN subscription_packages sp ON sp.subscriptionItemId = ? AND sp.for_affiliate = 1
      WHERE a.refer_code = ? 
    `;

    const resultPromo = await DB.query(sql, [
      promocode,
      forPackage,
      1,
      forPackage,
      promocode,
      forPackage,
      promocode,
    ]);

    if (!resultPromo || resultPromo.length === 0) return undefined;


      else if (resultPromo[0].type === "promo") {
        resultPromo[0].allowedPaymentMethods = asArray(
          resultPromo[0].allowedPaymentMethods
        );
        return {
          data: resultPromo[0],
        };
      } else if (resultPromo[0].type === "refer") {
        return {
          data: {
            promoCodeGreetings: "Refer Code Applied!",
            reduce_price: resultPromo[0].price * 0.2,
            promocode: promocode,
            allowedPaymentMethods: [],
            promo_type: "refercode",
          },
        };

      }

      else if (resultPromo[0].type === "affiliate") {

        return {
          data: {
            promoCodeGreetings: "Refer Code Applied!",
            reduce_price: resultPromo[0].price * resultPromo[0].discount,
            promocode: promocode,
            allowedPaymentMethods: [],
            promo_type: "refercode",
          },
        };

      }

      else return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };


  sponsorRequest = async (req) => {
    try {
      const sql1 = `INSERT INTO sponsor_request 
   (userId, product_name, company_product_details, link, contact_person_name, contact_person_phone, contact_person_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

      // let jsResult1;
      const result = await DB.query(sql1, [
        req.body.userId,
        req.body.productName,
        req.body.companyProductDetails,
        req.body.productLink,
        req.body.contactPersonName,
        req.body.contactPersonPhone,
        req.body.contactPersonEmail,
      ]);

      return result;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  userProfileFeature = async (req) => {
    const profileFeatureSql = `SELECT * FROM profile_feature WHERE isActive = 1 ORDER BY priority`;

    try {
      const result = await DB.query(profileFeatureSql);

      // Grouping the data by `type`
      const grouped = {
        Starred: [],
        Action: [],
      };

      result.forEach((item) => {
        if (item.type === "Starred") {
          grouped.Starred.push(item);
        } else if (item.type === "Action") {
          grouped.Action.push(item);
        }
      });

      // Returning in the desired structure
      return [
        {
          catName: "Starred",
          data: grouped.Starred,
        },
        {
          catName: "Action",
          data: grouped.Action,
        },
      ];
    } catch (error) {
      console.error("Error fetching profile features:", error);
      return undefined;
    }
  };

   verifyRentPromoCode = async (req) => {
    try {
      const { promoCode, promoType, productId, amount } = req.body;

      // Ensure productId is an array if it's not
      let productIdArray = Array.isArray(productId) ? productId : [productId];

      // Convert the productId(s) to JSON format (array of ids)
      const productIdJson = JSON.stringify(productIdArray);
    
      const promoExistsSql = `
  (SELECT
    'promo' AS type,
    reduce_price,
    NULL AS product_discount,
    payment_method_type,
    excluded_payment_methods,
    promoCodeGreetings
  FROM dynamic_promocode 
  WHERE promo_code = ? 
    AND promo_type = ? 
    AND (
      (minimun_purchase IS NOT NULL AND ? >= minimun_purchase) 
      OR 
      (minimun_purchase IS NULL AND JSON_CONTAINS(product_ids, ?, '$')) 
      OR
      (promo_type = 'store' AND minimun_purchase IS NULL AND JSON_OVERLAPS(product_ids, ?))
    )
    AND is_active = 1 
  LIMIT 1)

  UNION ALL

  (SELECT 
    'refer' AS type,
    NULL AS reduce_price,
    NULL AS product_discount,
    '' AS payment_method_type,
    JSON_ARRAY('Gp', 'Bl') AS excluded_payment_methods,
    NULL AS promoCodeGreetings
  FROM users
  WHERE refer_code = ?
  LIMIT 1)

  UNION ALL

  (SELECT 
    'affiliate' AS type,
    NULL AS reduce_price,
    product_discount,
    '' AS payment_method_type,
    JSON_ARRAY('Gp', 'Bl') AS excluded_payment_methods,
    NULL AS promoCodeGreetings
  FROM affiliate_user
  WHERE refer_code = ?
  LIMIT 1)
`;

      let result = await DB.query(promoExistsSql, [
        promoCode,
        promoType,
        amount,               // minimum purchase check
        JSON.stringify(productId), // single product ID check
        productIdJson,        // multiple product IDs check
        promoCode,            // for users.refer_code
        promoCode             // for affiliate_user.refer_code
      ]);

      if (result && result.length > 0) {
        result = result[0];
         if(result.type === "refer"){
          result.reduce_price = amount * 0.2;
         } else if(result.type === "affiliate"){
          result.reduce_price = amount * result.product_discount; 
         }
        // Parse excluded_payment_methods if exists
        if (result.excluded_payment_methods) {
          result.excluded_payment_methods = JSON.parse(
            result.excluded_payment_methods
          );
        }

        return {
          success: true,
          data: result,
        };
      }

      return {
        success: false,
        message: "Promocode not found",
      };
    } catch (e) {
      console.error("Error verifying rent promo code:", e);
      return {
        success: false,
        message: "Error verifying promocode",
      };
    }
  };


  binVerify = async (req) => {
    const { bin_number } = req.body;

    try {
      const sql = `SELECT * FROM promo_bin_mapping AS bm JOIN  promo AS pm ON pm.id = bm.promo_id WHERE bm.bin_number = ? AND pm.status = 1`;
      const result = await DB.query(sql, [bin_number]);

      if (result.length > 0) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
        };
      }
    } catch (e) {
      console.log("Error occurred during bin verification:", e);
      // If an error occurs during database query or processing
      return {
        success: false,
        error: "An error occurred during bin verification",
      };
    }
  };

  //newly added
  truncateOtp = async () => {
    const sql = `TRUNCATE TABLE otps`;
    try {
      await DB.query(sql);
      return true;
    } catch (e) {
      return false;
    }
  };

  getDynamicPaymentMethod = async (req) => {
    try {
      const sql = `SELECT * FROM dynamic_payment_method WHERE purpose = ? AND is_active = 1 ORDER BY priority`;
      const result = await DB.query(sql, [req.query.purpose]);

      if (result.length > 0) {
        return {
          success: true,
          data: result.map((row) => ({
            ...row,
            url: rewriteBackendApiUrl(row.url),
          })),
        };
      } else {
        return {
          success: false,
          data: [],
        };
      }
    } catch (e) {
      return {
        success: false,
        error: "An error occurred during bin verification",
      };
    }
  };

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
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  checkAppVersion = async (req) => {
    try {
      const sql = `
        SELECT * 
        FROM app_release_version 
        WHERE isActive = 1 
          AND platform = ?
          AND (CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) > CAST(SUBSTRING_INDEX(?, '.', 1) AS UNSIGNED)
          OR (CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) = CAST(SUBSTRING_INDEX(?, '.', 1) AS UNSIGNED)
              AND CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', -2), '.', 1) AS UNSIGNED) > CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(?, '.', -2), '.', 1) AS UNSIGNED))
          OR (CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) = CAST(SUBSTRING_INDEX(?, '.', 1) AS UNSIGNED)
              AND CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', -2), '.', 1) AS UNSIGNED) = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(?, '.', -2), '.', 1) AS UNSIGNED)
              AND CAST(SUBSTRING_INDEX(version, '.', -1) AS UNSIGNED) > CAST(SUBSTRING_INDEX(?, '.', -1) AS UNSIGNED))) LIMIT 1
      `;

      
      const result = await DB.query(sql, [
        req.body.platform,
        req.body.version,
        req.body.version,
        req.body.version,
        req.body.version,
        req.body.version,
        req.body.version,
      ]);

      if (result && result.length > 0) {
        return { isUpdateAvailable: true, versionData: result[0] };
      }
      return { isUpdateAvailable: false };
    } catch (e) {
      console.error(e);
      return { isUpdateAvailable: false, error: e.message };
    }
  };

  getHomeBannerListV2 = async () => {
    try {
      const sql1 = `Select * from home_banner_controller where status = 1 and version = 2 ORDER BY created_at DESC `;

      // let jsResult1;
      const result = await DB.query(sql1);
      // const data = JSON.parse(result[0].homeData)
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  CornJobgetHomeDataApp = async () => {
    return runWithCronLock("home", async () => {
      const startedAt = Date.now();
      const data = { data: [] };
      let jsResult1 = null;

      try {
        const results1 = await DB.query(`CALL get_combined_static_app()`);
        jsResult1 = unwrapCallResults(results1);
        if (jsResult1) {
          const newest = safeResultIndex(jsResult1, 1);
          const free = safeResultIndex(jsResult1, 2);
          if (newest != null) {
            data.data.push({ name: "নতুন", data: newest });
          }
          if (free != null) {
            data.data.push({ name: "ফ্রি", data: free });
          }
        }
      } catch (err) {
        logSectionError("home", "static", err);
      }

      try {
        const sqlTrend = `SELECT 
                ab.id, ab.name, ab.en_name,ab.description,
                ab.author_name,
                ab.premium,ab.thumb_path,
                ab.price,
                ab.isSubRestricted,
                ab.play_count,
                ab.mybl_play_count,
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
                   INNER JOIN
                audiobooks AS ab ON ab.id in (Select audiobook_id from episodes where id = apcl.episode_id )
            WHERE
                apcl.audiobook_id IS NULL AND
                apcl.created_at >= NOW() - INTERVAL ? DAY
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;
        const resultTrend = await DB.query(sqlTrend, [1]);
        const top10 = await DB.query(sqlTrend, [30]);
        if (top10) {
          data.data.push({ name: "শীর্ষ ১০", data: top10 });
        }
        if (resultTrend) {
          data.data.push({ name: "ট্রেন্ডিং", data: resultTrend });
        }
      } catch (err) {
        logSectionError("home", "trending", err);
      }

      try {
        const categories = await loadCategoryIds(DB);
        for (let i = 0; i < categories.length; i++) {
          try {
            if (i === 16) {
              const premium = safeResultIndex(jsResult1, 4);
              if (premium != null) {
                data.data.push({ name: "প্রিমিয়াম", data: premium });
              }
            }

            const results3 = await DB.query(
              "CALL get_combined_data_by_category(?)",
              categories[i]
            );
            const jsResult3 = unwrapCallResults(results3);
            if (
              jsResult3 &&
              Array.isArray(jsResult3[1]) &&
              jsResult3[1].length > 0 &&
              jsResult3[0] &&
              jsResult3[0][0]
            ) {
              data.data.push({
                name: jsResult3[0][0].name,
                categoryId: jsResult3[0][0].category_id,
                categoryPrice: jsResult3[0][0].price,
                forRent: jsResult3[0][0].for_rent,
                categoryRentDuration: jsResult3[0][0].rent_duration_day,
                data: jsResult3[1],
              });
            }
          } catch (err) {
            logSectionError("home", `category:${categories[i]}`, err);
          }
        }
      } catch (err) {
        logSectionError("home", "categories", err);
      }

      safePushPodcast(data, jsResult1);

      return persistHomeCronData({
        db: DB,
        data,
        mysqlColumn: "homeData",
        redisKey: "cache:homeData",
        jobName: "home",
        startedAt,
      });
    });
  };

  CornJobgetHomeDataMybl = async () => {
    return runWithCronLock("mybl", async () => {
      const startedAt = Date.now();
      const data = { data: [] };
      let jsResult1 = null;

      try {
        const results1 = await DB.query(`CALL get_combined_static_app_mybl()`);
        jsResult1 = unwrapCallResults(results1);
        if (jsResult1) {
          const free = safeResultIndex(jsResult1, 2);
          const newest = safeResultIndex(jsResult1, 1);
          if (free != null) {
            data.data.push({ name: "ফ্রি অডিওবুক", data: free });
          }
          if (newest != null) {
            data.data.push({ name: "নতুন", data: newest });
          }
        }
      } catch (err) {
        logSectionError("mybl", "static", err);
      }

      try {
        const sqlTrend = `SELECT 
                ab.id, ab.name, ab.en_name,
                ab.author_name,
                ab.premium,ab.thumb_path,
                ab.price,
                ab.play_count,
                ab.mybl_play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), @default_rate)
                    FROM
                    ratings_mybl AS r
                    WHERE
                        r.audiobook_id = ab.id
                ) AS rating,
                 COUNT(apcl.id) AS total_played
            FROM
            audiobook_play_count_log_mybl AS apcl
                    LEFT JOIN
                audiobooks AS ab ON ab.id in (Select audiobook_id from episodes where id = apcl.episode_id )
            WHERE
                apcl.audiobook_id IS NULL AND
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;
        const resultTrend = await DB.query(sqlTrend);
        if (resultTrend) {
          data.data.push({ name: "ট্রেন্ডিং", data: resultTrend });
        }
      } catch (err) {
        logSectionError("mybl", "trending", err);
      }

      try {
        const categories = await loadCategoryIds(DB);
        for (let i = 0; i < categories.length; i++) {
          if (categories[i] === 25) {
            continue;
          }
          try {
            const results3 = await DB.query(
              "CALL get_combined_data_by_category_mybl(?)",
              categories[i]
            );
            safePushCategorySection(data, results3);
          } catch (err) {
            logSectionError("mybl", `category:${categories[i]}`, err);
          }
        }
      } catch (err) {
        logSectionError("mybl", "categories", err);
      }

      safePushPodcast(data, jsResult1);

      return persistHomeCronData({
        db: DB,
        data,
        mysqlColumn: "homeDataMybl",
        redisKey: "cache:homeDataMybl",
        jobName: "mybl",
        startedAt,
      });
    });
  };

  CornJobgetHomeDataAppHomeFree = async () => {
    return runWithCronLock("free", async () => {
      const startedAt = Date.now();
      const data = { data: [] };
      let jsResult1 = null;

      try {
        const results1 = await DB.query(`CALL get_combined_static_app_all_free()`);
        jsResult1 = unwrapCallResults(results1);
        const newest = safeResultIndex(jsResult1, 1);
        if (newest != null) {
          data.data.push({ name: "নতুন", data: newest });
        }
      } catch (err) {
        logSectionError("free", "static", err);
      }

      try {
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
                apcl.audiobook_id IS NULL AND ab.price = '0' AND 
                (DATE_FORMAT(apcl.created_at, '%Y%c%d')) >= DATE_FORMAT(SUBDATE(NOW(), 7), '%Y%c%d')
                GROUP BY ab.id
                ORDER BY total_played DESC
                LIMIT 10;`;
        const resultTrend = await DB.query(sqlTrend);
        if (resultTrend) {
          data.data.push({ name: "ট্রেন্ডিং", data: resultTrend });
        }
      } catch (err) {
        logSectionError("free", "trending", err);
      }

      try {
        const categories = await loadCategoryIds(DB);
        for (let i = 0; i < categories.length; i++) {
          try {
            const results3 = await DB.query(
              "CALL get_combined_data_by_category_free(?)",
              categories[i]
            );
            safePushCategorySection(data, results3);
          } catch (err) {
            logSectionError("free", `category:${categories[i]}`, err);
          }
        }
      } catch (err) {
        logSectionError("free", "categories", err);
      }

      safePushPodcast(data, jsResult1);

      return persistHomeCronData({
        db: DB,
        data,
        mysqlColumn: "homeDataFree",
        redisKey: "cache:homeDataFree",
        jobName: "free",
        startedAt,
      });
    });
  };

  getHomeDataNew = async () => {
    try {
      const sql1 = `Select homeData from homepage_data where track_key ="home_data" AND status = 1 AND version = 2`;

      // let jsResult1;
      const result = await DB.query(sql1);
      const data = JSON.parse(result[0].homeData);
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  pushDataToRedis = async (req) => {
    try {
      const data = req.body;
      await redisClient.set(req.query.key, JSON.stringify(data));
      return data;
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  insertAppUsageFeedback = async (req) => {
    try {
      const data = req.body;
      const sql1 = `INSERT INTO app_usage_feedback(userId, over_all_ratings, recommanded_to_friend_ratings, review) VALUES (?, ?, ?, ?)`;
      const result = await DB.query(sql1, [
        data.userId,
        data.over_all_ratings,
        data.recommanded_to_friend_ratings,
        data.review,
      ]);
      return data;
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  getDataFromRedis = async (req) => {
    try {
      const data = await redisClient.get(req.query.key);
      return JSON.parse(data);
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };
}

module.exports = new HomeModel();
