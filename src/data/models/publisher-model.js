const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const s3Helper = require("../../utils/s3-helper");
const CryptoUtils = require("../../utils/crypto-utils");
const redisClient = require("../../utils/redis-client");
const moment = require("moment");

const pubport = "pubport";
const publishersAudiobooks = "publishersAudiobooks";
const monthlyUniqueCount = "monthlyUniqueCount";
const audiobookWiseSummary = "audiobookWiseSummary";

class PublisherModel {
  tableName = "publishers";

  getAll = async () => {
    const sql = "CALL get_entities(?)";
    try {
      const results = await DB.query(sql, [this.tableName]);
      if (results) {
        // sp returns extra data, need the first one
        return results[0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getBlockedPublisher = async () => {
    const sql = `SELECT * FROM ${this.tableName} WHERE deleted = ?`;
    try {
      const results = await DB.query(sql, [1]);
      if (results) {
        // sp returns extra data, need the first one
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findById = async (id) => {
    const sql = "CALL get_entity_by_id(?, ?)";
    try {
      const results = await DB.query(sql, [id, this.tableName]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };
  findByIdPublisherBook = async (id) => {
    const sql = "CALL get_entity_by_id(?, ?)";
    try {
      const results = await DB.query(sql, [id, "book_publishers"]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  updatePublisherById = async (
    email,
    phone,
    full_name,
    address,
    imageUrl,
    id,
    en_name
  ) => {
    try {
      // var default_rate = 5
      // const sql = 'CALL get_castcrew_audiobook_details(?)';

      const sql = `UPDATE book_publishers SET email = ?, phone =?, full_name = ?, address = ?, imageUrl = ?, en_name = ? WHERE id = ? `;
      const result = await DB.query(sql, [
        email,
        phone,
        full_name,
        address,
        imageUrl,
        en_name,
        id,
      ]);
      // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      // const result = await DB.query(sql,[id]);
      if (result) {
        //console.log(re)
        return "Success";
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      // coreUtils.printStringify(e);
      // LoggerError.log(e)
      return undefined;
    }
  };

  findByCredential = async (credential) => {
    const sql = "CALL get_publisher_by_credential(?)";
    try {
      const results = await DB.query(sql, [credential]);
      if (results) {
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findByCredentialBookPublisher = async (credential) => {
    try {
      const query = `
        SELECT pu.*, bp.full_name AS pub_name, bp.imageUrl AS pub_imageUrl, bp.revenue_threshold, bp.revenue_share, bp.onboarded_at
        FROM publisher_users pu
        LEFT JOIN book_publishers bp
        ON pu.publisher_id = bp.id
        WHERE (pu.email = ? OR pu.phone = ?) LIMIT 1;
      `;
      const result = await DB.query(query, [credential, credential]);
      if (result) {
        return result[0];
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  create = async (body) => {
    const { fullName, email, phone, address } = body;
    const hashedPassword = await CryptoUtils.encrypt(body.password);
    const sql = "CALL create_publisher(?, ?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        email,
        phone,
        fullName,
        hashedPassword,
        address,
      ]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
            return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  bookPublisherCreate = async (
    email,
    phone,
    fullName,
    passHash,
    address,
    publisherName,
    designation
  ) => {
    try {
      const sql = `
        INSERT INTO publisher_portal_requests (email, phone, full_name, pass_hash, address, publisher_name, role)
          VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      const results = await DB.query(sql, [
        email,
        phone,
        fullName,
        passHash,
        address,
        publisherName,
        designation,
      ]);
      return results;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  update = async (req) => {
    try {
      const { id, fullName, email, phone, address, imageUrl } = req.body;
      const sql = `
        UPDATE publisher_users
        SET full_name = ?,
          email = ?,
          phone = ?,
          address = ?,
          imageUrl = ?
        WHERE id = ?;
      `;
      const result = await DB.query(sql, [
        fullName,
        email,
        phone,
        address,
        imageUrl,
        id,
      ]);
      return { success: true, message: "Update successful" };
    } catch (e) {
      LoggerError.log(e);
      return { success: false, message: "Update failed" };
    }
  };

  updatePublisherStatus = async (id, deletestatus) => {
    const sql = `UPDATE ${this.tableName} SET deleted = ? WHERE id = ?`;
    try {
      const result = await DB.query(sql, [deletestatus, id]);
      if (result) {
        // sp with update query returns obj with affected rows
        return result;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getPublishersAudiobooks = async (req) => {
    try {
      var publisherId = req.query.publisherId;
      const sql = `SELECT *, (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id) AS rating,
                (SELECT 
                    count(distinct apcl.user_id) as unique_paid_users
                FROM
                    audiobook_play_count_log AS apcl
                        LEFT JOIN
                    audiobooks AS ab ON apcl.audiobook_id = ab.id
                WHERE 
                ab.publisher_id = ? AND apcl.isSubscribedUser =1 AND apcl.isPremiumAudiobook =1 AND
                apcl.audiobook_id IS not null AND apcl.audiobook_id = a.id) AS unique_paid_user,
                (SELECT 
                    count(distinct apcl.user_id) as unique_free_users
                FROM
                    audiobook_play_count_log AS apcl
                        LEFT JOIN
                    audiobooks AS ab ON apcl.audiobook_id = ab.id
                WHERE 
                ab.publisher_id = ? AND apcl.isSubscribedUser = 0 AND
                apcl.audiobook_id IS not null AND apcl.audiobook_id = a.id ) AS unique_free_user
                FROM audiobooks as a WHERE a.approval_status = 1 AND a.publisher_id = ? AND a.deleted = 0 ORDER BY a.created_at`;
      const result = await DB.query(sql, [
        publisherId,
        publisherId,
        publisherId,
      ]);
      if (result) {
        const key = `${pubport}:${publishersAudiobooks}:${publisherId}`;
        await redisClient.set(key, JSON.stringify(result));
        return result;
      }
      return undefined;
    } catch (e) {
      // coreUtils.printStringify(e);
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPublishersAudiobooksFromRedis = async (req) => {
    try {
      const key = `${pubport}:${publishersAudiobooks}:${req.query.publisherId}`;
      const result = await redisClient.get(key);
      return JSON.parse(result);
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  // getPublishersAudiobooksFromRedis = async
  getPublishersById = async (req) => {
    try {
      var publisherId = req.query.id;
      const sql = `SELECT * FROM book_publishers WHERE id =? LIMIT 1`;
      const result = await DB.query(sql, [publisherId]);
      if (result) {
        return result[0];
      }
      return undefined;
    } catch (e) {
      // coreUtils.printStringify(e);
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPublisherslist = async (req) => {
    try {
      var publisherId = req.query.publisherId;
      const sql = `
        SELECT bp.* FROM book_publishers AS bp
        WHERE bp.deleted = 0 AND bp.revenue_threshold IS NOT NULL ORDER BY bp.created_at DESC
      `;
      const result = await DB.query(sql, [publisherId]);
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

  getPublishersAudiobookSummaryToday = async (req) => {
    var publisherId = req.query.publisherId;

    try {
      const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
      const result = await DB.query(sql, [publisherId]);
      const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel = 'web';`;
      const result2 = await DB.query(sql2, [publisherId]);

      const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel = 'android';`;
      const result3 = await DB.query(sql3, [publisherId]);

      const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
      const result31 = await DB.query(sql31, [publisherId]);

      const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
      const result4 = await DB.query(sql4, [publisherId]);

      const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
      const result5 = await DB.query(sql5, [publisherId]);
      if (result) {
        return {
          total_played: "" + result[0].total_played,
          web: "" + result2[0].web,
          android: "" + result3[0].android,
          not_defined: "" + result31[0].not_defined,
          free: "" + result4[0].total_played,
          paid: "" + result5[0].total_played,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPublishersAudiobookSummary = async (req) => {
    var publisherId = req.query.publisherId;

    try {
      const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null;`;
      const result = await DB.query(sql, [publisherId]);
      const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel = 'web';`;
      const result2 = await DB.query(sql2, [publisherId]);

      const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel = 'android';`;
      const result3 = await DB.query(sql3, [publisherId]);

      const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
      const result31 = await DB.query(sql31, [publisherId]);

      const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)));`;
      const result4 = await DB.query(sql4, [publisherId]);

      const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)));`;
      const result5 = await DB.query(sql5, [publisherId]);
      if (result) {
        return {
          total_played: "" + result[0].total_played,
          web: "" + result2[0].web,
          android: "" + result3[0].android,
          not_defined: "" + result31[0].not_defined,
          free: "" + result4[0].total_played,
          paid: "" + result5[0].total_played,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getMonthWiseWholeSummary = async (req) => {
    const { publisherId } = req.query;
    try {
      const query = `
        WITH play_counts AS (
          SELECT 
            apcl.id,
            apcl.from_channel,
            ab.price,
            ab.deleted,
            DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear
          FROM audiobook_play_count_log AS apcl
          LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
          LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
          WHERE ab.publisher_id = ? AND apcl.episode_id IS NOT NULL
        )

        SELECT 
          monthYear,
          COUNT(id) AS totalPlayedCount,
          COUNT(CASE WHEN from_channel = 'web' THEN id END) AS totalPlayedCountOnWeb,
          COUNT(CASE WHEN from_channel = 'android' THEN id END) AS totalPlayedCountOnAndroid,
          COUNT(CASE WHEN from_channel != 'android' AND from_channel != 'web' THEN id END) AS totalPlayedCountOnOthers
        FROM play_counts
        GROUP BY monthYear
        ORDER BY monthYear DESC;
      `;
      const result = await DB.query(query, [publisherId]);
      return result;
    } catch (e) {
      console.log(e);
      // coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAudiobookWiseWholeSummary = async (req) => {
    const { publisherId, audiobookId } = req.query;
    try {
      const query = `
        WITH play_counts AS (
            SELECT 
                apcl.id,
                apcl.from_channel,
                ab.price,
                ab.deleted,
                DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear
            FROM audiobook_play_count_log AS apcl
            LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
            LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE ab.publisher_id = ? AND apcl.episode_id IS NOT NULL AND ab.id = ?
        )

        SELECT 
          monthYear,
            COUNT(id) AS totalPlayed,
            COUNT(CASE WHEN from_channel = 'web' THEN id END) AS totalPlayedOnWeb,
            COUNT(CASE WHEN from_channel = 'android' THEN id END) AS totalPlayedOnAndroid,
            COUNT(CASE WHEN from_channel != 'android' AND from_channel != 'web' THEN id END) AS totalPlayedOnOthers,
            COUNT(CASE WHEN price = 0 AND deleted = 0 THEN id END) AS totalPlayedFree,
            COUNT(CASE WHEN price != 0 AND deleted = 0 THEN id END) AS totalPlayedPaid
        FROM play_counts
        GROUP BY monthYear
        ORDER BY monthYear DESC;
      `;
      const result = await DB.query(query, [publisherId, audiobookId]);
      const key = `${pubport}:${audiobookWiseSummary}:${publisherId},${audiobookId}`;
      await redisClient.set(key, JSON.stringify(result));
      return result;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAudiobookWiseWholeSummaryFromRedis = async (req) => {
    try {
      const { publisherId, audiobookId } = req.query;
      const key = `${pubport}:${audiobookWiseSummary}:${publisherId},${audiobookId}`;
      const response = await redisClient.get(key);
      return JSON.parse(response);
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  getMonthlyUniqueCount = async (req) => {
    try {
      const { publisherId } = req.query;
      const queryUniqueCount = `
        WITH result AS (
          WITH play_counts AS (
            SELECT apcl.user_id, apcl.id, apcl.from_channel, ab.price, ab.deleted, ab.name, ab.id AS audiobook_id, DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear
            FROM audiobook_play_count_log AS apcl
            LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
            LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE ab.publisher_id = ? AND apcl.episode_id IS NOT NULL
          )
          SELECT *
          FROM play_counts
          GROUP BY monthYear, apcl.user_id, audiobook_id
        )
        SELECT monthYear, audiobook_id AS audiobookId, name, COUNT(*) AS uniqueCount,
        SUM(COUNT(*)) OVER(PARTITION BY audiobook_id ORDER BY monthYear) AS cumulativeCountSum
        FROM result
        GROUP BY monthYear, audiobook_id
        ORDER BY monthYear, audiobook_id
      `;
      const audiobookCount = await DB.query(queryUniqueCount, [publisherId]);
      // const queryTotalUsers = `
      //   WITH publisher_id AS (
      //     SELECT ? AS id
      //   ),
      //   play_counts AS (
      //     SELECT
      //       apcl.user_id,
      //       ep.audiobook_id,
      //       DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear,
      //       apcl.isSubscribedUser
      //     FROM audiobook_play_count_log AS apcl
      //     LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
      //     LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
      //     WHERE ab.publisher_id = (SELECT id FROM publisher_id)
      //       AND apcl.episode_id IS NOT NULL
      //       AND ab.price != 0
      //       AND ab.premium = 1
      //       AND (
      //         DATE_FORMAT(apcl.created_at, '%Y-%m') < '2024-12' OR
      //         apcl.user_id IN (
      //           SELECT user_id
      //           FROM kabbik_stream_session
      //           GROUP BY user_id, audiobook_id
      //           HAVING SUM(streaming_time) >= 180
      //             AND audiobook_id != 'null'
      //         )
      //       )
      //   ),
      //   user_audiobook_counts AS (
      //     SELECT
      //       user_id,
      //       audiobook_id,
      //       monthYear,
      //       isSubscribedUser
      //     FROM play_counts
      //     GROUP BY user_id, audiobook_id, monthYear, isSubscribedUser
      //   ),
      //   filtered_users AS (
      //     SELECT
      //       uac.user_id,
      //       uac.audiobook_id,
      //       uac.monthYear,
      //       uac.isSubscribedUser
      //     FROM user_audiobook_counts uac
      //     WHERE NOT EXISTS (
      //       SELECT 1
      //       FROM user_audiobook_counts prev_month
      //       WHERE prev_month.user_id = uac.user_id
      //         AND prev_month.audiobook_id = uac.audiobook_id
      //         AND prev_month.monthYear < uac.monthYear
      //         AND prev_month.isSubscribedUser = uac.isSubscribedUser
      //     )
      //   ),
      //   publisher_details AS (
      //     SELECT revenue_threshold, revenue_share
      //     FROM book_publishers AS bp
      //     WHERE id = (SELECT id FROM publisher_id)
      //   ),
      //   final_counts AS (
      //     SELECT
      //       f.monthYear,
      //       COUNT(DISTINCT CASE WHEN f.isSubscribedUser = 1 THEN f.user_id END) AS monthlyPaidListen,
      //       COUNT(DISTINCT CASE WHEN f.isSubscribedUser != 1 THEN f.user_id END) AS monthlyFreeListen
      //     FROM filtered_users f
      //     GROUP BY f.monthYear
      //   ),
      //   cumulative_counts AS (
      //     SELECT
      //       fc.monthYear,
      //       fc.monthlyPaidListen,
      //       fc.monthlyFreeListen,
      //       SUM(fc.monthlyPaidListen) OVER (ORDER BY fc.monthYear) AS cumulativeMonthlyPaidListen,
      //       SUM(fc.monthlyFreeListen) OVER (ORDER BY fc.monthYear) AS cumulativeMonthlyFreeListen
      //     FROM final_counts fc
      //   ),
      //   result AS (
      //     SELECT
      //       cc.monthYear,
      //       cc.monthlyPaidListen,
      //       cc.cumulativeMonthlyPaidListen,
      //       cc.monthlyFreeListen,
      //       cc.cumulativeMonthlyFreeListen,
      //       CASE
      //         WHEN cc.cumulativeMonthlyPaidListen < (SELECT revenue_threshold FROM publisher_details)
      //           THEN 0
      //         WHEN cc.cumulativeMonthlyPaidListen - cc.monthlyPaidListen < (SELECT revenue_threshold FROM publisher_details)
      //           THEN GREATEST(cc.cumulativeMonthlyPaidListen - (SELECT revenue_threshold FROM publisher_details), 0)
      //         ELSE
      //           cc.monthlyPaidListen
      //       END AS paidListenToPay
      //     FROM cumulative_counts cc
      //     ORDER BY cc.monthYear
      //   )
      //   SELECT
      //     *,
      //     SUM(paidListenToPay) OVER(ORDER BY monthYear) AS cumulativePaidListenToPay,
      //     SUM(monthlyPaidListen) OVER() AS totalMonthlyPaidListen,
      //     SUM(monthlyFreeListen) OVER() AS totalMonthlyFreeListen,
      //     (SELECT deduction_rate
      //     FROM publisher_revenue_deduction_rate
      //     WHERE publisher_id = (SELECT id FROM publisher_id)
      //       AND month_year = result.monthYear
      //     ) AS deductionRate
      //   FROM result;
      // `;
      const queryTotalUniqueAudiobookCount = `
        WITH play_counts AS (
            SELECT apcl.user_id, apcl.id, apcl.from_channel, ab.price, ab.deleted, ab.name, ab.id AS audiobook_id, DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear
            FROM audiobook_play_count_log AS apcl
            LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
            LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE ab.publisher_id = ? AND apcl.episode_id IS NOT NULL
        )
        SELECT audiobook_id AS audiobookId, COUNT(DISTINCT user_id) AS uniquePlayCount
        FROM play_counts
        GROUP BY audiobook_id;
      `;
      const totalUniqueAudiobookCount = await DB.query(
        queryTotalUniqueAudiobookCount,
        [publisherId]
      );
      // const totalUser = await DB.query(queryTotalUsers, [publisherId]);
      const totalUser = null;
            const result = { totalUser, audiobookCount, totalUniqueAudiobookCount };
      const key = `${pubport}:${monthlyUniqueCount}:${publisherId}`;
      await redisClient.set(key, JSON.stringify(result));
      return result;
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  getMonthlyUniqueCountFromRedis = async (req) => {
    try {
      const key = `${pubport}:${monthlyUniqueCount}:${req.query.publisherId}`;
      const response = await redisClient.get(key);
      return JSON.parse(response);
    } catch (err) {
      console.log(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  getPublishersPaidUsersSummary = async (req) => {
    var publisherId = req.query.publisherId;

    try {
      const sql = `SELECT 
                count(distinct apcl.user_id) as unique_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.audiobook_id IS not null;`;
      const result = await DB.query(sql, [publisherId]);

      const sql2 = `SELECT 
                count(distinct apcl.user_id) as unique_paid_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.isSubscribedUser =1 AND apcl.isPremiumAudiobook =1 AND
            apcl.audiobook_id IS not null;`;
      const result2 = await DB.query(sql2, [publisherId]);

      const sql3 = `SELECT 
                count(distinct apcl.user_id) as unique_free_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.isSubscribedUser = 0 AND
            apcl.audiobook_id IS not null;`;
      const result3 = await DB.query(sql3, [publisherId]);

      //     const sql31 = `SELECT
      //     COUNT(apcl.id) AS android
      // FROM
      //     audiobook_play_count_log AS apcl
      //     LEFT JOIN
      //     episodes AS ep ON apcl.episode_id = ep.id
      //         LEFT JOIN
      //     audiobooks AS ab ON ep.audiobook_id = ab.id
      // WHERE
      // ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
      //     const result31 = await DB.query(sql31, [publisherId]);

      //     const sql4 = `SELECT
      //     COUNT(apcl.id) AS total_played
      // FROM
      //     audiobook_play_count_log AS apcl
      //     LEFT JOIN
      //     episodes AS ep ON apcl.episode_id = ep.id
      //         LEFT JOIN
      //     audiobooks AS ab ON ep.audiobook_id = ab.id
      // WHERE
      // ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
      // OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)));`;
      //     const result4 = await DB.query(sql4, [publisherId]);

      //     const sql5 = `SELECT
      //     COUNT(apcl.id) AS total_played
      // FROM
      //     audiobook_play_count_log AS apcl
      //     LEFT JOIN
      //     episodes AS ep ON apcl.episode_id = ep.id
      //         LEFT JOIN
      //     audiobooks AS ab ON ep.audiobook_id = ab.id
      // WHERE
      // ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
      //         OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)));`;
      //     const result5 = await DB.query(sql5, [publisherId]);
      if (result) {
        return {
          unique_users: "" + result[0].unique_users,
          unique_paid_users: "" + result2[0].unique_paid_users,
          unique_free_users: "" + result3[0].unique_free_users,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPublishersAudiobookSummaryYesterday = async (req) => {
    var publisherId = req.query.publisherId;

    try {
      const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d'));`;
      const result = await DB.query(sql, [publisherId]);
      const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel = 'web';`;
      const result2 = await DB.query(sql2, [publisherId]);

      const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel = 'android';`;
      const result3 = await DB.query(sql3, [publisherId]);

      const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
      const result31 = await DB.query(sql31, [publisherId]);

      const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d'));`;
      const result4 = await DB.query(sql4, [publisherId]);

      const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
                    (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
      const result5 = await DB.query(sql5, [publisherId]);
      if (result) {
        return {
          total_played: "" + result[0].total_played,
          web: "" + result2[0].web,
          android: "" + result3[0].android,
          not_defined: "" + result31[0].not_defined,
          free: "" + result4[0].total_played,
          paid: "" + result5[0].total_played,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAdminPublishserId = async (adminId) => {
    const sql = "SELECT id FROM publishers WHERE admin_id = ?";
    try {
      const results = await DB.query(sql, adminId);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  delete = async (id) => {
    const sql = "CALL delete_entity_soft(?, ?)";
    try {
      const results = await DB.query(sql, [id, this.tableName]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  setCronAudiobookSummary = async (req) => {
    const { publisherId } = req.query;
    try {
      const analyticsQuery = `
        WITH play_counts AS (
          SELECT 
            apcl.id,
            apcl.from_channel,
            ab.price,
            ab.deleted,
            ab.id AS audiobook_id,
            DATE_FORMAT(apcl.created_at, '%Y-%m') AS monthYear
          FROM audiobook_play_count_log AS apcl
          LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
          LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
          WHERE ab.publisher_id = ?
            AND apcl.episode_id IS NOT NULL
        )

        SELECT 
          monthYear,
          audiobook_id,
          COUNT(id) AS totalPlayedCount,
          COUNT(CASE WHEN from_channel = 'android' THEN id END) AS totalPlayedCountOnAndroid,
          COUNT(CASE WHEN from_channel = 'web' THEN id END) AS totalPlayedCountOnWeb,
          COUNT(CASE WHEN from_channel != 'android' AND from_channel != 'web' THEN id END) AS totalPlayedCountOnOthers
        FROM play_counts
        GROUP BY monthYear,audiobook_id
        ORDER BY monthYear ASC;
      `;
      const analyticsResult = await DB.query(analyticsQuery, [publisherId]);
      const insertQuery = `
        INSERT INTO publisher_audiobook_summary (
          publisher_id,
          audiobook_id,
          month_year,
          total_played_count,
          total_played_count_android,
          total_played_count_web,
          total_played_count_others
        )
        values ${analyticsResult
          .map(
            (val) =>
              `(${publisherId}, ${val.audiobook_id}, '${val.monthYear}', ${val.totalPlayedCount}, ${val.totalPlayedCountOnAndroid}, ${val.totalPlayedCountOnWeb}, ${val.totalPlayedCountOnOthers})`
          )
          .join(",")};
      `;
      if (analyticsResult.length) {
        const insertResult = await DB.query(insertQuery);
      }
      // const key = `${pubport}:${audiobookWiseSummary}:${publisherId},${audiobookId}`;
      // await redisClient.set(key, JSON.stringify(result));
      return { message: "Audiobook summary inserted successfully" };
    } catch (e) {
      console.log(e);
      // coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getMonthlyRevenueByPublisher = async (req) => {
    const { publisherId, monthYear } = req.query;
    try {
      const userAudiobookCombinationsQuery = `
        WITH publisher_id AS (
          SELECT ? AS id
        ),
        play_counts AS (
          SELECT
            apcl.user_id,
            ep.audiobook_id,
            DATE_FORMAT(apcl.created_at, '%Y-%m') AS month_year,
            apcl.isSubscribedUser
          FROM audiobook_play_count_log AS apcl
          LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
          LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
          WHERE ab.publisher_id = (SELECT id FROM publisher_id)
            AND DATE_FORMAT(apcl.created_at, '%Y-%m') = ?
            AND apcl.isSubscribedUser = 1
            AND apcl.episode_id IS NOT NULL
            AND (apcl.isPremiumAudiobook = 1 OR apcl.isPremiumEpisode = 1)
            AND (
              DATE_FORMAT(apcl.created_at, '%Y-%m') < '2024-12' OR
              apcl.user_id IN (
                SELECT user_id
                FROM kabbik_stream_session
                GROUP BY user_id, audiobook_id
                HAVING SUM(streaming_time) >= 180
                  AND audiobook_id != 'null'
              )
            )
        ),
        user_audiobook_counts AS (
          SELECT
            user_id,
            audiobook_id,
            month_year
          FROM play_counts
          GROUP BY user_id, audiobook_id, month_year
        )
        SELECT
          CAST(user_id AS UNSIGNED) AS user_id,
          CAST(audiobook_id AS UNSIGNED) AS audiobook_id,
          month_year
        FROM user_audiobook_counts uac
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_audiobook_combinations ua_comb
          WHERE ua_comb.user_id = uac.user_id
            AND ua_comb.audiobook_id = uac.audiobook_id
            AND ua_comb.month_year < uac.month_year
        );
      `;
      const userAudiobookCombinationsResult = await DB.query(
        userAudiobookCombinationsQuery,
        [publisherId, monthYear]
      );
      if (userAudiobookCombinationsResult.length > 0) {
        const insertUserAudiobookCombinationsQuery = `
          INSERT INTO user_audiobook_combinations (user_id, audiobook_id, month_year)
          values ${userAudiobookCombinationsResult
            .map(
              (val) =>
                `(${val.user_id}, ${val.audiobook_id}, '${val.month_year}')`
            )
            .join(",")};
        `;
        const insertuserAudiobookCombinationsResult = await DB.query(
          insertUserAudiobookCombinationsQuery
        );
      }
      const lastMonthDeductionRateQuery = `
        SELECT *
        FROM publisher_revenue_deduction_rate
        WHERE month_year = ?
          AND publisher_id = ?
      `;
      const lastMonthDeductionRateResult = await DB.query(
        lastMonthDeductionRateQuery,
        [monthYear, publisherId]
      );
      if (!lastMonthDeductionRateResult.length) {
        const insertLastMonthDeductionRateQuery = `
          INSERT INTO publisher_revenue_deduction_rate (publisher_id, month_year, deduction_rate)
          VALUES (?, ?, 0)
        `;
        const insertLastMonthDeductionRateResult = await DB.query(
          insertLastMonthDeductionRateQuery,
          [publisherId, monthYear]
        );
      }
      const publisherDetailsQuery = `
        SELECT
          bp.revenue_threshold,
          bp.revenue_share,
          prdr.deduction_rate
        FROM book_publishers bp
        CROSS JOIN publisher_revenue_deduction_rate prdr
        WHERE bp.id = ?
          AND prdr.publisher_id = ?
          AND prdr.month_year = ?;
      `;
      const publisherDetailsResult = await DB.query(publisherDetailsQuery, [
        publisherId,
        publisherId,
        monthYear,
      ]);
      const previousRevenueQuery = `
        SELECT
          COALESCE(SUM(total_listens), 0) AS total_listens,
          COALESCE(SUM(paid_listens), 0) AS paid_listens
        FROM publisher_revenue_share
        WHERE publisher_id = ?
          AND month_year = ?
      `;
      const previousRevenueResult = await DB.query(previousRevenueQuery, [
        publisherId,
        moment(`${monthYear}-01`).subtract(1, "month").format("YYYY-MM"),
      ]);
      const shareSchema = JSON.parse(publisherDetailsResult[0].revenue_share);
      let newMonthlyRevenue = 0,
        slabs = Object.keys(shareSchema).reverse(),
        total_paid_listens = Math.max(
          previousRevenueResult[0].total_listens +
            userAudiobookCombinationsResult.length -
            publisherDetailsResult[0].revenue_threshold,
          0
        );
      for (let i = 0; i < slabs.length; i++) {
        if (total_paid_listens >= Number(slabs[i])) {
          if (previousRevenueResult[0].paid_listens < Number(slabs[i])) {
            // when new listens falls within two slabs
            newMonthlyRevenue +=
              (total_paid_listens - Number(slabs[i]) + 1) *
                shareSchema[slabs[i]] +
              (Number(slabs[i]) - 1 - previousRevenueResult[0].paid_listens) *
                (shareSchema[slabs[i + 1]] ?? 0);
          } else {
            // when new listens falls within a single slab
            newMonthlyRevenue +=
              (total_paid_listens - previousRevenueResult[0].paid_listens) *
              shareSchema[slabs[i]];
          }
          break;
        }
      }
      const insertPublisherRevenueQuery = `
        INSERT INTO publisher_revenue_share (publisher_id, new_listens, total_listens, paid_listens, revenue, month_year)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
      const insertPublisherRevenueResult = await DB.query(
        insertPublisherRevenueQuery,
        [
          Number(publisherId),
          userAudiobookCombinationsResult.length,
          previousRevenueResult[0].total_listens +
            userAudiobookCombinationsResult.length,
          total_paid_listens,
          Math.round(
            newMonthlyRevenue *
              (1 - publisherDetailsResult[0].deduction_rate / 100)
          ), // rounded to nearest integer
          monthYear,
        ]
      );
      return {
        message: `Monthly revenue inserted for publisher id ${publisherId} in ${monthYear}`,
        success: true,
      };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  getRevenue = async (req) => {
    try {
      const { publisherId, start, end } = req.query;
      const query = `
        SELECT * FROM publisher_revenue_share
        WHERE publisher_id = ?
          AND month_year >= ? AND month_year <= ?
      `;
      const result = await DB.query(query, [Number(publisherId), start, end]);
            return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  /** publisher_users.id (JWT user_id) -> book_publishers.id, or undefined. */
  getPublisherIdByUserId = async (userId) => {
    try {
      const query = `
        SELECT publisher_id FROM publisher_users WHERE id = ? LIMIT 1
      `;
      const result = await DB.query(query, [Number(userId)]);
      return result[0] ? result[0].publisher_id : undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  /** Payments Kabbik has made to a publisher, newest first. */
  getPaymentHistory = async (publisherId) => {
    try {
      const query = `
        SELECT id, amount, payment_date,
               payment_period_first_date, payment_period_end_date
        FROM book_publisher_payment_history
        WHERE publisher_id = ?
        ORDER BY payment_date DESC, id DESC
      `;
      return await DB.query(query, [Number(publisherId)]);
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  getAudiobooksAnalyticsByPublisher = async (req) => {
    try {
      const { publisherId, start, end } = req.query;
      const query = `
        SELECT * FROM publisher_audiobook_summary
        WHERE publisher_id = ?
          AND month_year >= ? AND month_year <= ?
      `;
      const result = await DB.query(query, [Number(publisherId), start, end]);
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  getUserListenersSoFar = async (req) => {
    try {
      const { publisherId } = req.query;
      const listenersQuery = `
        SELECT 
          COUNT(DISTINCT apcl.user_id) AS total_listeners,
          COUNT(DISTINCT CASE WHEN apcl.isSubscribedUser = 1 THEN apcl.user_id END) AS paid_listeners,
          COUNT(DISTINCT CASE WHEN apcl.isSubscribedUser = 0 THEN apcl.user_id END) AS free_listeners
        FROM audiobook_play_count_log AS apcl
        LEFT JOIN episodes AS ep ON apcl.episode_id = ep.id
        LEFT JOIN audiobooks AS ab ON ep.audiobook_id = ab.id
        WHERE ab.publisher_id = ?
          AND apcl.episode_id IS NOT NULL
          AND DATE_FORMAT(apcl.created_at, '%Y-%m') <= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m');
      `;
      const listenersResult = await DB.query(listenersQuery, [
        Number(publisherId),
      ]);
      const insertQuery = `
        INSERT INTO publisher_user_listeners (publisher_id, total_listener, paid_listener, free_listener)
        VALUES (?, ?, ?, ?);
      `;
      const insertResult = await DB.query(insertQuery, [
        Number(publisherId),
        listenersResult[0].total_listeners,
        listenersResult[0].paid_listeners,
        listenersResult[0].free_listeners,
      ]);
      return { message: "Inserted data", success: true };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  getUserListeners = async (req) => {
    try {
      const { publisherId } = req.query;
      const query = `
        SELECT * FROM publisher_user_listeners
        WHERE publisher_id = ?
      `;
      const result = await DB.query(query, [Number(publisherId)]);
      return result[0] ?? null;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };
}

module.exports = new PublisherModel();
