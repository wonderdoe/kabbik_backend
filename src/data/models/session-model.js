const DB = require("../db");
const moment = require("moment-timezone");
const LoggerError = require("../../utils/logger-error");
const useragent = require("useragent");
const { v4: uuidv4 } = require("uuid");
const redisClient = require("../../utils/redis-client");
const constants = require("../../../src/utils/constants");
const xlsx = require('xlsx');

class SessionModel {
  init = async (req) => {
    try {
      const ua = req.header("user-agent");
      const agent = useragent.parse(ua);
      const sessionId = uuidv4();
      const key = `sessions:${moment().tz("UTC").format("DD:HH")}:${sessionId}`;
      const cookieSession = req.cookies.redisSessionId;
      const sessionExists = cookieSession !== undefined ? true : false;
      const prevAudiobook = sessionExists
        ? await redisClient.hGet(cookieSession, "audiobookId")
        : "null";
      const prevEpisode = sessionExists
        ? await redisClient.hGet(cookieSession, "episodeId")
        : "null";
      let audiobookChanged = false,
        episodeChanged = false;
      if (req.query.id === "null" || req.query.id === "undefined") {
        audiobookChanged = false;
      } else {
        if (req.query.id !== prevAudiobook) audiobookChanged = true;
      }
      if (
        req.query.episode_id === "null" ||
        req.query.episode_id === "undefined"
      ) {
        episodeChanged = false;
      } else {
        if (req.query.episode_id !== prevEpisode) episodeChanged = true;
      }
      if (
        !sessionExists ||
        (sessionExists && audiobookChanged) ||
        (sessionExists && episodeChanged)
      ) {
        const sessionObj = {
          id: sessionId,
          userId: `${req.currentUser.id}`,
          audiobookId:
            req.query.id === "undefined" ? "null" : `${req.query.id}`,
          episodeId:
            req.query.episode_id === "undefined"
              ? "null"
              : `${req.query.episode_id}`,
          date: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          createdAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          updatedAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          streamingTime: `${0}`,
          activeTime: `${0}`,
          deviceId: "null",
          source: agent.os.toJSON().family,
        };
        await redisClient.hSet(key, sessionObj, "while init");
        await redisClient.expire(key, constants.REDIS_KEY_MAXAGE);
        const result = await redisClient.hGetAll(key);
        return { data: result, key, setCookie: true };
      } else {
        const result = await redisClient.hGetAll(cookieSession);
        return { data: result, key, setCookie: false };
      }
    } catch (e) {
      console.error(e);
      return { error: `${e}` };
    }
  };

  log = async (req) => {
    try {
      const ua = req.header("user-agent");
      const agent = useragent.parse(ua);
      const sessionId = req.cookies.redisSessionId;
      const sessionExists = sessionId !== undefined ? true : false;
      const prevHour = sessionExists
          ? sessionId.split(":")[2]
          : `${moment().tz("UTC").subtract(1, "hours").format("HH")}`,
        currHour = moment().tz("UTC").format("HH");
      const hourChanged = sessionId && prevHour != currHour;

      if (hourChanged || !sessionExists) {
        const newSessionId = uuidv4();
        const key = `sessions:${moment()
          .tz("UTC")
          .format("DD:HH")}:${newSessionId}`;
        const audiobookId = sessionExists
          ? await redisClient.hGet(sessionId, "audiobookId")
          : "null";
        const episodeId = sessionExists
          ? await redisClient.hGet(sessionId, "episodeId")
          : "null";
        const sessionObj = {
          id: newSessionId,
          userId: `${req.currentUser.id}`,
          audiobookId: `${audiobookId}`,
          episodeId: `${episodeId}`,
          date: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          createdAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          updatedAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          streamingTime: `${0}`,
          activeTime: `${0}`,
          deviceId: "null",
          source: agent.os.toJSON().family,
        };
        await redisClient.hSet(key, sessionObj);
        await redisClient.expire(key, constants.REDIS_KEY_MAXAGE);
        const result = await redisClient.hGetAll(key);
        return { data: result, key };
      }
      await redisClient.hIncrBy(
        sessionId,
        "activeTime",
        constants.LOG_INTERVAL / 1000
      );
      await redisClient.hSet(
        sessionId,
        "updatedAt",
        `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`
      );
      await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
      if (req.query.id !== "null" && req.query.play === "true") {
        await redisClient.hIncrBy(
          sessionId,
          "streamingTime",
          constants.LOG_INTERVAL / 1000
        );
      }
      const result = await redisClient.hGetAll(sessionId);
      return { data: result, key: sessionId };
    } catch (e) {
      console.error(e);
      return { error: `${e}` };
    }
  };

  initKabbik = async (req) => {
    try {
      const ua = req.header("user-agent");
      const agent = useragent.parse(ua);
      const sessionId = uuidv4();
      const key = `kabbik_sessions:${moment()
        .tz("UTC")
        .format("DD:HH")}:${sessionId}`;
      const cookieSession = req.cookies.redisSessionId;
      const sessionExists = cookieSession !== undefined ? true : false;
      const prevAudiobook = sessionExists
        ? await redisClient.hGet(cookieSession, "audiobookId")
        : "null";
      const prevEpisode = sessionExists
        ? await redisClient.hGet(cookieSession, "episodeId")
        : "null";
      let audiobookChanged = false,
        episodeChanged = false;
      if (req.query.id === "null" || req.query.id === "undefined") {
        audiobookChanged = false;
      } else {
        if (req.query.id !== prevAudiobook) audiobookChanged = true;
      }
      if (
        req.query.episode_id === "null" ||
        req.query.episode_id === "undefined"
      ) {
        episodeChanged = false;
      } else {
        if (req.query.episode_id !== prevEpisode) episodeChanged = true;
      }
      if (
        !sessionExists ||
        (sessionExists && audiobookChanged) ||
        (sessionExists && episodeChanged)
      ) {
        const sessionObj = {
          id: sessionId,
          userId: `${req.currentUser.id}`,
          audiobookId:
            req.query.id === "undefined" ? "null" : `${req.query.id}`,
          episodeId:
            req.query.episode_id === "undefined"
              ? "null"
              : `${req.query.episode_id}`,
          date: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          createdAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          updatedAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          streamingTime: `${0}`,
          activeTime: `${0}`,
          deviceId: "null",
          source: agent.os.toJSON().family,
        };
        await redisClient.hSet(key, sessionObj, "while init");
        await redisClient.expire(key, constants.REDIS_KEY_MAXAGE);
        const result = await redisClient.hGetAll(key);
        return { data: result, key, setCookie: true };
      } else {
        const result = await redisClient.hGetAll(cookieSession);
        return { data: result, key, setCookie: false };
      }
    } catch (e) {
      console.error(e);
      return { error: `${e}` };
    }
  };

  logKabbik = async (req) => {
    try {
      const ua = req.header("user-agent");
      const agent = useragent.parse(ua);
      const sessionId = req.cookies.redisSessionId;
      const sessionExists = sessionId !== undefined ? true : false;
      const prevHour = sessionExists
          ? sessionId.split(":")[2]
          : `${moment().tz("UTC").subtract(1, "hours").format("HH")}`,
        currHour = moment().tz("UTC").format("HH");
      const hourChanged = sessionId && prevHour != currHour;

      if (hourChanged || !sessionExists) {
        const newSessionId = uuidv4();
        const key = `kabbik_sessions:${moment()
          .tz("UTC")
          .format("DD:HH")}:${newSessionId}`;
        const audiobookId = sessionExists
          ? await redisClient.hGet(sessionId, "audiobookId")
          : "null";
        const episodeId = sessionExists
          ? await redisClient.hGet(sessionId, "episodeId")
          : "null";
        const sessionObj = {
          id: newSessionId,
          userId: `${req.currentUser.id}`,
          audiobookId: `${audiobookId}`,
          episodeId: `${episodeId}`,
          date: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          createdAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          updatedAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          streamingTime: `${0}`,
          activeTime: `${0}`,
          deviceId: "null",
          source: agent.os.toJSON().family,
        };
        await redisClient.hSet(key, sessionObj);
        await redisClient.expire(key, constants.REDIS_KEY_MAXAGE);
        const result = await redisClient.hGetAll(key);
        return { data: result, key };
      }

      const lastUpdatedRaw = await redisClient.hGet(sessionId, "updatedAt");
      // parse timestamp (stored as 'YYYY-MM-DD HH:mm:ss' UTC)
      const lastUpdatedMoment = lastUpdatedRaw
        ? moment.tz(lastUpdatedRaw, "YYYY-MM-DD HH:mm:ss", "UTC")
        : null;
      const now = moment().tz("UTC");
      const secondsSince = lastUpdatedMoment
        ? now.diff(lastUpdatedMoment, "seconds")
        : Number.MAX_SAFE_INTEGER; // force update if no timestamp

      const MIN_UPDATE_SECONDS = 10;
      if (secondsSince < MIN_UPDATE_SECONDS) {
        // refresh expiry and return current data without incrementing counters
        await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
        const current = await redisClient.hGetAll(sessionId);
        return { data: current, key: sessionId, skipped: true };
      }
      // --- END throttle check ---
      await redisClient.hIncrBy(
        sessionId,
        "activeTime",
        constants.LOG_INTERVAL / 1000
      );
      await redisClient.hSet(
        sessionId,
        "updatedAt",
        `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`
      );
      
      await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
      if (req.query.id !== "null" && req.query.play === "true") {
        await redisClient.hIncrBy(
          sessionId,
          "streamingTime",
          constants.LOG_INTERVAL / 1000
        );
      }

      const result = await redisClient.hGetAll(sessionId);
      return { data: result, key: sessionId };
    } catch (e) {
      console.error(e);
      return { error: `${e}` };
    }
  };

  logKabbikApp = async (req) => {
    try {
      const ua = req.header("user-agent");
      const agent = useragent.parse(ua);
      const sessionId = req.cookies.redisSessionId;
      const sessionExists = sessionId !== undefined ? true : false;
      const prevHour = sessionExists
          ? sessionId.split(":")[2]
          : `${moment().tz("UTC").subtract(1, "hours").format("HH")}`,
        currHour = moment().tz("UTC").format("HH");
      const hourChanged = sessionId && prevHour != currHour;
      const audiobookId = sessionExists
        ? await redisClient.hGet(sessionId, "audiobookId")
        : "null";
      const episodeId = sessionExists
        ? await redisClient.hGet(sessionId, "episodeId")
        : "null";
      const { id: newAudiobookId, episode_id: newEpisodeId } = req.query;
      const audiobookChanged = newAudiobookId !== audiobookId,
        episodeIdChanged = newEpisodeId !== episodeId;
      if (
        hourChanged ||
        !sessionExists ||
        audiobookChanged ||
        episodeIdChanged
      ) {
        const newSessionId = uuidv4();
        const key = `kabbik_sessions:${moment()
          .tz("UTC")
          .format("DD:HH")}:${newSessionId}`;
        const sessionObj = {
          id: newSessionId,
          userId: `${req.currentUser.id}`,
          audiobookId: `${audiobookChanged ? newAudiobookId : audiobookId}`,
          episodeId: `${episodeIdChanged ? newEpisodeId : episodeId}`,
          date: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          createdAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          updatedAt: `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`,
          streamingTime: `${0}`,
          activeTime: `${0}`,
          deviceId: "null",
          source: agent.os.toJSON().family,
        };
        await redisClient.hSet(key, sessionObj);
        await redisClient.expire(key, constants.REDIS_KEY_MAXAGE);
        const result = await redisClient.hGetAll(key);
        return { data: result, key };
      }
      // await redisClient.hIncrBy(
      //   sessionId,
      //   "activeTime",
      //   constants.LOG_INTERVAL / 1000
      // );
      // await redisClient.hSet(
      //   sessionId,
      //   "updatedAt",
      //   `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`
      // );
      // await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
      // if (req.query.id !== "null" && req.query.play === "true") {
      //   await redisClient.hIncrBy(
      //     sessionId,
      //     "streamingTime",
      //     constants.LOG_INTERVAL / 1000
      //   );
      // }
      const lastUpdatedRaw = await redisClient.hGet(sessionId, "updatedAt");
      // parse timestamp (stored as 'YYYY-MM-DD HH:mm:ss' UTC)
      const lastUpdatedMoment = lastUpdatedRaw
        ? moment.tz(lastUpdatedRaw, "YYYY-MM-DD HH:mm:ss", "UTC")
        : null;
      const now = moment().tz("UTC");
      const secondsSince = lastUpdatedMoment
        ? now.diff(lastUpdatedMoment, "seconds")
        : Number.MAX_SAFE_INTEGER; // force update if no timestamp

      const MIN_UPDATE_SECONDS = 10;
      if (secondsSince < MIN_UPDATE_SECONDS) {
        // refresh expiry and return current data without incrementing counters
        await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
        const current = await redisClient.hGetAll(sessionId);
        return { data: current, key: sessionId, skipped: true };
      }
      // --- END throttle check ---

      await redisClient.hIncrBy(
        sessionId,
        "activeTime",
        constants.LOG_INTERVAL / 1000
      );
      await redisClient.hSet(
        sessionId,
        "updatedAt",
        `${moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")}`
      );
      await redisClient.expire(sessionId, constants.REDIS_KEY_MAXAGE);
      if (req.query.id !== "null" && req.query.play === "true") {
        await redisClient.hIncrBy(
          sessionId,
          "streamingTime",
          constants.LOG_INTERVAL / 1000
        );
      }
      const result = await redisClient.hGetAll(sessionId);
      return { data: result, key: sessionId };
    } catch (e) {
      console.error(e);
      return { error: `${e}` };
    }
  };

  cronjob = async (req) => {
    try {
      let accessKey = req.query.accessKey;
      let insertDate = req.query.insertDate;
      let yesterdayTimestampGlobal;

      if (!accessKey) {
        accessKey = "testaccesskey";
      }

      if (!insertDate) {
        insertDate = moment()
          .subtract(1, "days")
          .tz("Asia/Dhaka")
          .format("YYYY-MM-DD");
        let tempDate = moment()
          .subtract(1, "days")
          .tz("Asia/Dhaka")
          .format("YYYY-MM-DD 23:59:59");
        yesterdayTimestampGlobal = moment(tempDate)
          .subtract(6, "hours")
          .format("YYYY-MM-DD HH:mm:ss");
      } else {
        let tempDate = moment(insertDate).format("YYYY-MM-DD 23:59:59");
        yesterdayTimestampGlobal = moment(tempDate)
          .subtract(6, "hours")
          .format("YYYY-MM-DD HH:mm:ss");
      }

      const checkRecordQuery = `Select * from my_bl_user_report where DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka'))  = ?`;
      const checkReportExsits = await DB.query(checkRecordQuery, [insertDate]);

      if (checkReportExsits.length > 0) {
        return {
          state: false,
          msg: "record already exsits",
        };
      }

      const filterSessionQuery = `SELECT st.user_id, 
          SUM(st.active_time) AS total_active_time, 
          SUM(st.streaming_time) AS total_streaming_time
   FROM stream_session AS st
   WHERE DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = ?
   GROUP BY st.user_id`;

      const initIntoStatesQuery = `INSERT INTO statistics (user_id, active_time, streaming_time, date) VALUES `;

      if (accessKey === "testaccesskey") {
        const sessionArgRes = await DB.query(filterSessionQuery, [insertDate]);

        const batchSize = 1000; // Number of records per batch
        const totalRecords = sessionArgRes.length;
        if (totalRecords < 1) {
          return {
            state: false,
            msg: "No record found",
          };
        }
        for (let i = 0; i < totalRecords; i += batchSize) {
          const batch = sessionArgRes.slice(i, i + batchSize);
          let valuesQuery = batch
            .map(
              (userData) =>
                `(${userData.user_id}, ${userData.total_active_time}, ${userData.total_streaming_time}, '${yesterdayTimestampGlobal}')`
            )
            .join(", ");

          const statisTicsInsert = initIntoStatesQuery + valuesQuery;

          await DB.query(statisTicsInsert, valuesQuery);
        }
        const fetchUserStats = `
                WITH last_30_days AS (
                SELECT DISTINCT user_id 
                FROM statistics 
                WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE_SUB(DATE('${insertDate}'), INTERVAL 1 DAY)
            ),
            today_users AS (
                SELECT DISTINCT user_id 
                FROM statistics 
                WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')
            ),
            old_users AS (
                SELECT tu.user_id 
                FROM today_users tu
                JOIN users u ON tu.user_id = u.id
                WHERE DATE(CONVERT_TZ(u.created_at, 'UTC', 'Asia/Dhaka')) < DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY)
                AND u.client_id = 'mybl-client-2024'
                AND u.client_secret = 'WLZijzSBpFFjeTp'
                AND tu.user_id NOT IN (SELECT user_id FROM last_30_days)
            ),
            new_users AS (
                SELECT  DISTINCT usr.id AS user_id
                FROM statistics st JOIN users AS usr ON st.user_id = usr.id
                WHERE DATE(CONVERT_TZ(usr.created_at, 'UTC', 'Asia/Dhaka'))  = DATE( CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka'))
                AND DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) ='${insertDate}'
                AND usr.client_id = 'mybl-client-2024'
                AND usr.client_secret = 'WLZijzSBpFFjeTp' 
            ),
           return_users AS (
    SELECT DISTINCT tu.user_id
    FROM today_users tu
   WHERE tu.user_id NOT IN (SELECT user_id FROM old_users) AND tu.user_id NOT IN (SELECT user_id FROM new_users)
)
            SELECT         
                COALESCE(AVG(st.active_time), 0) AS total_avg_active_time,
                COALESCE(SUM(st.streaming_time), 0) AS total_streaming_time,
                COALESCE(AVG(st.streaming_time), 0) AS total_avg_streaming_time,
                COALESCE(COUNT(st.user_id), 0) AS dau_count,
                COUNT(st.user_id) AS session_unique_msisdn,
                COALESCE(COUNT(CASE WHEN st.streaming_time IS NOT NULL AND st.streaming_time != 0 THEN st.user_id END), 0) AS streaming_unique_msisdn,
                  (SELECT COUNT(*) FROM statistics WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE('${insertDate}')) AS mau_count,
                (SELECT COUNT(*) FROM old_users) AS total_old_user_count,
                (SELECT COUNT(*) FROM new_users) AS total_new_user_count,
                (SELECT COUNT(*) FROM return_users) AS total_return_user
            FROM 
                statistics AS st 
            WHERE 
                DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')`;

        const insertIntoMyBlReport = `INSERT INTO my_bl_user_report (
                dau_count, mau_count, return_user, new_user, old_user, average_session, streaming_average_session,
                  total_streaming, streaming_unique_msisdn, session_unique_msisdn, revenue, total_hit, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const res = await DB.query(fetchUserStats);

        const calculateRevenueQuery = `SELECT COALESCE(sum(bw.amount), 0) as mybl_revenue, COUNT(bi.userId) AS total_hit from bkash_webhook AS bw JOIN bkash_invoice AS  bi ON bw.subscriptionRequestId = bi.subscriptionRequestId JOIN users AS us ON bi.userId = us.id
                where bi.source ='Banglalink' AND DATE(CONVERT_TZ(bw.trxDate, 'UTC', 'Asia/Dhaka')) = '${insertDate}' AND bw.paymentStatus= 'SUCCEEDED_PAYMENT' AND us.client_secret = 'WLZijzSBpFFjeTp' AND us.user_name NOT LIKE '%@%'`;

        const toTalRevenue = await DB.query(calculateRevenueQuery);

        const insertIntoToBlReportTable = await DB.query(insertIntoMyBlReport, [
          res[0].dau_count,
          res[0].mau_count,
          res[0].total_return_user,
          res[0].total_new_user_count,
          res[0].total_old_user_count,
          res[0].total_avg_active_time,
          res[0].total_avg_streaming_time,
          res[0].total_streaming_time,
          res[0].streaming_unique_msisdn,
          res[0].session_unique_msisdn,
          toTalRevenue[0].mybl_revenue,
          toTalRevenue[0].total_hit,
          yesterdayTimestampGlobal,
        ]);

        return {
          state: true,
          msg: "Success",
        };
      } else {
        return {
          state: false,
          msg: "Wrong Access Key",
        };
      }
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

   dashboardDataCornjob = async () => {
    try {
      const accessKey = "testaccesskey";
      let insertDate;
      let yesterdayTimestampGlobal;

      insertDate = moment().subtract(1, 'days').tz('Asia/Dhaka').format('YYYY-MM-DD');
      let tempDate = moment().subtract(1, 'days').tz('Asia/Dhaka').format('YYYY-MM-DD 23:59:59');
      yesterdayTimestampGlobal = moment(tempDate).subtract(6, 'hours').format('YYYY-MM-DD HH:mm:ss');
  
      const filterSessionQuery = `SELECT st.user_id, 
      SUM(st.active_time) AS total_active_time, 
      SUM(st.streaming_time) AS total_streaming_time
FROM stream_session AS st
WHERE DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = ?
GROUP BY st.user_id`;

      const initIntoStatesQuery = `INSERT INTO statistics (user_id, active_time, streaming_time, date) VALUES `;


      if (accessKey === "testaccesskey") {
        const sessionArgRes = await DB.query(filterSessionQuery, [
          insertDate
        ])

        const batchSize = 1000; // Number of records per batch
        const totalRecords = sessionArgRes.length;
        if (totalRecords < 1) {
          return {
            state: false,
            msg: "No record found"
          };
        }
        for (let i = 0; i < totalRecords; i += batchSize) {
          const batch = sessionArgRes.slice(i, i + batchSize);
          let valuesQuery = batch.map(userData => `(${userData.user_id}, ${userData.total_active_time}, ${userData.total_streaming_time}, '${yesterdayTimestampGlobal}')`).join(', ');

          const statisTicsInsert = initIntoStatesQuery + valuesQuery;

          await DB.query(statisTicsInsert, valuesQuery);
        }
        const fetchUserStats = `
            WITH last_30_days AS (
            SELECT DISTINCT user_id 
            FROM statistics 
            WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE_SUB(DATE('${insertDate}'), INTERVAL 1 DAY)
        ),
        today_users AS (
            SELECT DISTINCT user_id 
            FROM statistics 
            WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')
        ),
        old_users AS (
            SELECT tu.user_id 
            FROM today_users tu
            JOIN users u ON tu.user_id = u.id
            WHERE DATE(CONVERT_TZ(u.created_at, 'UTC', 'Asia/Dhaka')) < DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY)
            AND u.client_id = 'mybl-client-2024'
            AND u.client_secret = 'WLZijzSBpFFjeTp'
            AND tu.user_id NOT IN (SELECT user_id FROM last_30_days)
        ),
        new_users AS (
            SELECT  DISTINCT usr.id AS user_id
            FROM statistics st JOIN users AS usr ON st.user_id = usr.id
            WHERE DATE(CONVERT_TZ(usr.created_at, 'UTC', 'Asia/Dhaka'))  = DATE( CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka'))
            AND DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) ='${insertDate}'
            AND usr.client_id = 'mybl-client-2024'
            AND usr.client_secret = 'WLZijzSBpFFjeTp' 
        ),
       return_users AS (
SELECT DISTINCT tu.user_id
FROM today_users tu
WHERE tu.user_id NOT IN (SELECT user_id FROM old_users) AND tu.user_id NOT IN (SELECT user_id FROM new_users)
)
        SELECT         
            COALESCE(AVG(st.active_time), 0) AS total_avg_active_time,
            COALESCE(SUM(st.streaming_time), 0) AS total_streaming_time,
            COALESCE(AVG(st.streaming_time), 0) AS total_avg_streaming_time,
            COALESCE(COUNT(st.user_id), 0) AS dau_count,
            COUNT(st.user_id) AS session_unique_msisdn,
            COALESCE(COUNT(CASE WHEN st.streaming_time IS NOT NULL AND st.streaming_time != 0 THEN st.user_id END), 0) AS streaming_unique_msisdn,
              (SELECT COUNT(*) FROM statistics WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE('${insertDate}')) AS mau_count,
            (SELECT COUNT(*) FROM old_users) AS total_old_user_count,
            (SELECT COUNT(*) FROM new_users) AS total_new_user_count,
            (SELECT COUNT(*) FROM return_users) AS total_return_user
        FROM 
            statistics AS st 
        WHERE 
            DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')`;

        const insertIntoMyBlReport = `INSERT INTO my_bl_user_report (
            dau_count, mau_count, return_user, new_user, old_user, average_session, streaming_average_session,
              total_streaming, streaming_unique_msisdn, session_unique_msisdn, revenue, total_hit, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const res = await DB.query(fetchUserStats);

        const calculateRevenueQuery = `SELECT COALESCE(sum(bw.amount), 0) as mybl_revenue, COUNT(bi.userId) AS total_hit from bkash_webhook AS bw JOIN bkash_invoice AS  bi ON bw.subscriptionRequestId = bi.subscriptionRequestId JOIN users AS us ON bi.userId = us.id
            where bi.source ='Banglalink' AND DATE(CONVERT_TZ(bw.trxDate, 'UTC', 'Asia/Dhaka')) = '${insertDate}' AND bw.paymentStatus= 'SUCCEEDED_PAYMENT' AND us.client_secret = 'WLZijzSBpFFjeTp' AND us.user_name NOT LIKE '%@%'`;

        const toTalRevenue = await DB.query(calculateRevenueQuery);

        const insertIntoToBlReportTable = await DB.query(insertIntoMyBlReport, [
          res[0].dau_count,
          res[0].mau_count,
          res[0].total_return_user,
          res[0].total_new_user_count,
          res[0].total_old_user_count,
          res[0].total_avg_active_time,
          res[0].total_avg_streaming_time,
          res[0].total_streaming_time,
          res[0].streaming_unique_msisdn,
          res[0].session_unique_msisdn,
          toTalRevenue[0].mybl_revenue,
          toTalRevenue[0].total_hit,
          yesterdayTimestampGlobal
        ]);



        return {
          status: true,
          msg: "Success",
          data: {
            "DATE": moment(yesterdayTimestampGlobal).format('YYYY-MM-DD'),
            "DAU": res[0].dau_count,
            "MAU": res[0].mau_count,
            "App avg session minutes": (res[0].total_avg_active_time / 60).toFixed(2), // Convert to minutes
            "Streaming avg session Minutes": (res[0].total_avg_streaming_time / 60).toFixed(2), // Convert to minutes
            "Total Streaming Hours": (res[0].total_streaming_time / 3600).toFixed(2), // Convert to hours
            "Total Session msisdn count": res[0].session_unique_msisdn,
            "Total Streaming msisdn count": res[0].streaming_unique_msisdn,
            "New Users": res[0].total_new_user_count,
            "Returning Users": res[0].total_return_user,
            "Old users": res[0].total_old_user_count,
            "Revenue": toTalRevenue[0].mybl_revenue,
            "Total_hit": toTalRevenue[0].total_hit,
          }
        };
        
      } else {
        return {
          status: false,
          msg: "Wrong Access Key",
        };
      }
    } catch (e) {
      return {
        status: false,
        msg: "Wrong Access Key",
      };
    }
  };
   

   sendMyBlDashboardNotifyMail = async () => {
    try {
      const sql = `SELECT 
        DATE(bl.date) AS DATE,
        bl.dau_count AS DAU,
        bl.mau_count AS MAU,
        ROUND(bl.average_session / 60, 2) AS "App avg session minutes",
        ROUND(bl.streaming_average_session / 60, 2) AS "Streaming avg session Minutes",
        ROUND(bl.total_streaming / 3600, 2) AS "Total Streaming Hours",
        bl.streaming_unique_msisdn AS "Total Streaming Unique msisdn count",
        bl.new_user AS "New Users",
        bl.return_user AS "Returning Users",
        bl.old_user AS "Old users",
        bl.revenue AS "Revenue(Subscription)"
      FROM my_bl_user_report AS bl
      ORDER BY bl.id`;
  
      const result = await DB.query(sql);
  
      // Ensure result is properly formatted into JSON for worksheet
      const formattedResult = result.map((row) => ({
        DATE: row.DATE,
        DAU: row.DAU,
        MAU: row.MAU,
        "App avg session minutes": row["App avg session minutes"],
        "Streaming avg session Minutes": row["Streaming avg session Minutes"],
        "Total Streaming Hours": row["Total Streaming Hours"],
        "Total Streaming Unique msisdn count": row["Total Streaming Unique msisdn count"],
        "New Users": row["New Users"],
        "Returning Users": row["Returning Users"],
        "Old users": row["Old users"],
        "Revenue(Subscription)": row["Revenue(Subscription)"],
      }));
  
      // Create workbook and worksheet
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(formattedResult);
      xlsx.utils.book_append_sheet(workbook, worksheet, "Dashboard Report");
  
      // Generate Excel file buffer and convert to base64
      const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
      const base64data = buffer.toString("base64");
  
      // Send email with Brevo API
      const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";
      const response = await fetch(brevoApiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "api-key": `${process.env.BREVO_API_KEY}`,
        },
        body: JSON.stringify({
          sender: {
            name: "Wondersoft Solution",
            email: "wondersoftsolution@gmail.com",
          },
         to: [
            {
              email: "m.kamal@banglalink.net",
              name: "Md. Hasib Kamal",
            },
            {
              email: "hasrat.humayun@banglalink.net",
              name: "Hasrat Humayun",
            },
          ],
          bcc: [
            {
              email: "rafi.sakib@wondersoftsolution.com",
              name: "Rafi Sakib",
            },
            {
              email: "mosarofdiu123@gmail.com",
              name: "Mosaraf Soikat",
            },
          ],
          subject: "Mybl Dashboard Daily Report",
          htmlContent: `<html><head></head><body><p>Hello Hasib bhai and Hasrat Humayun apu,</p><p>The dashboard daily report is attached below.</p></body></html>`,
          attachment: [
            {
              name: `Dashboard Report_${moment().format("YYYY-MM-DD")}.xlsx`,
              content: base64data,
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          ],
        }),
      });
  
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  };



  kabbikUserReport = async (date, testkey) => {
    try {
      let accessKey = testkey;
      let insertDate = date;
      let yesterdayTimestampGlobal;

      

      if (!accessKey) {
        accessKey = "testaccesskey";
      }

      if (!insertDate) {
        insertDate = moment()
          .subtract(1, "days")
          .tz("Asia/Dhaka")
          .format("YYYY-MM-DD");
        let tempDate = moment()
          .subtract(1, "days")
          .tz("Asia/Dhaka")
          .format("YYYY-MM-DD 23:59:59");
        yesterdayTimestampGlobal = moment(tempDate)
          .subtract(6, "hours")
          .format("YYYY-MM-DD HH:mm:ss");
      } else {
        let tempDate = moment(insertDate).format("YYYY-MM-DD 23:59:59");
                yesterdayTimestampGlobal = moment(tempDate)
          .subtract(6, "hours")
          .format("YYYY-MM-DD HH:mm:ss");
          
      }

 

      const checkRecordQuery = `Select * from kabbik_user_report where DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka'))  = ?`;
      const checkReportExists = await DB.query(checkRecordQuery, [insertDate]);

      if (checkReportExists.length > 0) {
        return {
          state: false,
          msg: "record already exists",
        };
      }

      const filterSessionQuery = `
        SELECT st.user_id, 
          SUM(st.active_time) AS total_active_time, 
          SUM(st.streaming_time) AS total_streaming_time
        FROM kabbik_stream_session AS st
        WHERE DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = ?
        GROUP BY st.user_id
        ORDER BY  total_streaming_time DESC;
      `;

      const initIntoStatesQuery = `INSERT INTO kabbik_statistics (user_id, active_time, streaming_time, date) VALUES `;

      if (accessKey === "testaccesskey") {
        const sessionArgRes = await DB.query(filterSessionQuery, [insertDate]);

        const batchSize = 1000; // Number of records per batch
        const totalRecords = sessionArgRes.length;
        if (totalRecords < 1) {
          return {
            state: false,
            msg: "No record found",
          };
        }
        for (let i = 0; i < totalRecords; i += batchSize) {
          const batch = sessionArgRes.slice(i, i + batchSize);
          let valuesQuery = batch
            .map(
              (userData) =>
                `(${userData.user_id}, ${userData.total_active_time}, ${userData.total_streaming_time}, '${yesterdayTimestampGlobal}')`
            )
            .join(", ");

          const statisTicsInsert = initIntoStatesQuery + valuesQuery;

          await DB.query(statisTicsInsert, valuesQuery);
        }
        const fetchUserStats = `
          WITH last_30_days AS (
            SELECT DISTINCT user_id 
            FROM kabbik_statistics
            WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE_SUB(DATE('${insertDate}'), INTERVAL 1 DAY)
          ),
          today_users AS (
            SELECT DISTINCT user_id 
            FROM kabbik_statistics
            WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')
          ),
          old_users AS (
            SELECT tu.user_id 
            FROM today_users tu
            JOIN users u ON tu.user_id = u.id
            WHERE DATE(CONVERT_TZ(u.created_at, 'UTC', 'Asia/Dhaka')) < DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY)
            AND u.client_id IS NULL
            AND u.client_secret IS NULL
            AND tu.user_id NOT IN (SELECT user_id FROM last_30_days)
          ),
          new_users AS (
            SELECT  DISTINCT usr.id AS user_id
            FROM kabbik_statistics st JOIN users AS usr ON st.user_id = usr.id
            WHERE DATE(CONVERT_TZ(usr.created_at, 'UTC', 'Asia/Dhaka'))  = DATE( CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka'))
            AND DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) ='${insertDate}'
            AND usr.client_id IS NULL
            AND usr.client_secret IS NULL 
          ),
            return_users AS (
            SELECT DISTINCT tu.user_id
            FROM today_users tu
            WHERE tu.user_id NOT IN (SELECT user_id FROM old_users) AND tu.user_id NOT IN (SELECT user_id FROM new_users)
          )
          SELECT         
            COALESCE(AVG(st.active_time), 0) AS total_avg_active_time,
            COALESCE(SUM(st.streaming_time), 0) AS total_streaming_time,
            COALESCE(AVG(st.streaming_time), 0) AS total_avg_streaming_time,
            COALESCE(COUNT(st.user_id), 0) AS dau_count,
            COUNT(st.user_id) AS session_unique_msisdn,
            COALESCE(COUNT(CASE WHEN st.streaming_time IS NOT NULL AND st.streaming_time != 0 THEN st.user_id END), 0) AS streaming_unique_msisdn,
            (SELECT COUNT(*) FROM kabbik_statistics WHERE DATE(CONVERT_TZ(date, 'UTC', 'Asia/Dhaka')) BETWEEN DATE_SUB(DATE('${insertDate}'), INTERVAL 30 DAY) AND DATE('${insertDate}')) AS mau_count,
            (SELECT COUNT(*) FROM old_users) AS total_old_user_count,
            (SELECT COUNT(*) FROM new_users) AS total_new_user_count,
            (SELECT COUNT(*) FROM return_users) AS total_return_user
          FROM 
            kabbik_statistics AS st 
          WHERE 
            DATE(CONVERT_TZ(st.date, 'UTC', 'Asia/Dhaka')) = DATE('${insertDate}')`;

        const insertIntoKabbikReport = `
          INSERT INTO kabbik_user_report (
            dau_count, mau_count, return_user, new_user, old_user, average_session, streaming_average_session,
            total_streaming, streaming_unique_msisdn, session_unique_msisdn, revenue, total_hit, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const res = await DB.query(fetchUserStats);

        const calculateRevenueQuery = `
          SELECT SUM(revenue) AS kabbik_revenue, SUM(hit) AS total_hit FROM (
            SELECT
              COALESCE(SUM(bw.amount), 0) AS revenue,
              COUNT(bw.id) AS hit
            FROM (SELECT * FROM bkash_webhook WHERE DATE(CONVERT_TZ(trxDate, 'UTC', '+06:00')) = '${insertDate}' AND paymentStatus = "SUCCEEDED_PAYMENT") AS bw
            JOIN bkash_invoice AS  bi ON bw.subscriptionRequestId = bi.subscriptionRequestId
            JOIN users AS us ON bi.userId = us.id
            WHERE bi.source IS NULL or bi.source = '' AND DATE(CONVERT_TZ(bw.trxDate, 'UTC', 'Asia/Dhaka')) = '${insertDate}'
            AND us.client_secret IS NULL AND us.user_name NOT LIKE '%@%'

            UNION ALL

            SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(id) AS hit
            FROM bkash_onetime
            WHERE DATE(CONVERT_TZ(created_at, 'UTC', '+06:00')) = '${insertDate}'
              AND executeStatusMessage = 'Successful'
              AND amount IS NOT NULL
              AND (trafficSource = '' OR trafficSource IS NULL)
            
            UNION ALL

            SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(id) AS hit
            FROM robi_payment
            WHERE DATE(CONVERT_TZ(created_at, 'UTC', '+06:00')) = '${insertDate}'
              AND status = 'SUCCEEDED'
              AND amount <> ''
              AND amount IS NOT NULL
              AND from_channel <> 'MyBL'
            
            UNION ALL

            SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(id) AS hit
            FROM nagad_payment
            WHERE DATE(CONVERT_TZ(created_at, 'UTC', '+06:00')) = '${insertDate}'
              AND status = 'Success'
            AND amount IS NOT NULL
            AND (trafficSource IS NULL OR trafficSource = '')

            UNION ALL

            SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(id) AS hit
            FROM upay_payment
            WHERE DATE(CONVERT_TZ(created_at, 'UTC', '+06:00')) = '${insertDate}'
            AND status = 'success'
            AND amount IS NOT NULL
            AND (trafficSource IS NULL OR trafficSource = '')
            
            UNION ALL

            SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(id) AS hit
            FROM aamarPay
            WHERE DATE(CONVERT_TZ(created_at, 'UTC', '+06:00')) = '${insertDate}'
            AND ststus = 'Successful'
          ) AS combined_data;
        `;

        const toTalRevenue = await DB.query(calculateRevenueQuery);

        const insertIntoKabbikReportResult = await DB.query(
          insertIntoKabbikReport,
          [
            res[0].dau_count,
            res[0].mau_count,
            res[0].total_return_user,
            res[0].total_new_user_count,
            res[0].total_old_user_count,
            res[0].total_avg_active_time,
            res[0].total_avg_streaming_time,
            res[0].total_streaming_time,
            res[0].streaming_unique_msisdn,
            res[0].session_unique_msisdn,
            toTalRevenue[0].kabbik_revenue,
            toTalRevenue[0].total_hit,
            yesterdayTimestampGlobal,
          ]
        );

      const user30 = sessionArgRes[15];

        

        return {
          state: true,
          msg: "Success",
        };
      } else {
        return {
          state: false,
          msg: "Wrong Access Key",
        };
      }
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };



  searchUserStatsDateWise = async (req) => {
    try {
      const { fromDate, toDate } = req.query;
      const filterStatsQueryDateWise = `SELECT *
     FROM my_bl_user_report AS blReport WHERE DATE(CONVERT_TZ(blReport.date, 'UTC', '+06:00'))
      BETWEEN ? AND ?`;

      const statsResults = await DB.query(filterStatsQueryDateWise, [
        fromDate,
        toDate,
      ]);
            return {
        status: true,
        data: statsResults,
      };
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

}

module.exports = new SessionModel();
