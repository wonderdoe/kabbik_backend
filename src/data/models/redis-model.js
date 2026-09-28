const redisClient = require("../../utils/redis-client");
const ResponseUtils = require("../../utils/res-utils");
const DB = require("../db");
const moment = require("moment");

class RedisModel {
  redisSync = async () => {
    try {
      const targetTime = moment()
        .tz("UTC")
        .subtract(1, "hours")
        .format("DD:HH");
      const params = {
        MATCH: `sessions:${targetTime}:*`,
        COUNT: 1000,
      };
      let recordsString = "";
      let c = 0;
      let insertedKeys = [];
      for await (const key of redisClient.scanIterator(params)) {
        const obj = await redisClient.hGetAll(key);
        let temp = `('${obj.userId}', '${obj.audiobookId}', '${obj.episodeId}', '${obj.date}', '${obj.createdAt}', '${obj.updatedAt}', ${obj.streamingTime}, ${obj.activeTime}, '${obj.source}'), `;
        if (
          (obj.activeTime !== "0" && obj.streamingTime !== "0") ||
          (obj.audiobookId !== "undefined" && obj.episodeId !== "undefined")
        ) {
          c += 1;
          insertedKeys.push(key);
          recordsString += temp;
        }
      }
      const queryString = `
        INSERT INTO stream_session (
          user_id,
          audiobook_id,
          episode_id,
          date,
          created_at,
          updated_at,
          streaming_time,
          active_time,
          source
        )
        VALUES ${recordsString}`;
      if (c > 0) {
        const traillessQueryString = queryString.slice(
          0,
          queryString.length - 2
        );
        const queryResult = await DB.query(traillessQueryString);
        return { message: `${c} new records inserted.`, insertedKeys };
      }
      return { message: "No new records to insert." };
    } catch (err) {
      console.error(err);
      return { message: `Error occured during sync. ${err}` };
    }
  };

  kabbikSessionRedisSync = async () => {
    try {
      const targetTime = moment()
        .tz("UTC")
        .subtract(1, "hours")
        .format("DD:HH");
      const params = {
        MATCH: `kabbik_sessions:${targetTime}:*`,
        COUNT: 1000,
      };
      let recordsString = "";
      let c = 0;
      let insertedKeys = [];
      for await (const key of redisClient.scanIterator(params)) {
        const obj = await redisClient.hGetAll(key);
        let temp = `('${obj.userId}', '${obj.audiobookId}', '${obj.episodeId}', '${obj.date}', '${obj.createdAt}', '${obj.updatedAt}', ${obj.streamingTime}, ${obj.activeTime}, '${obj.source}'), `;
        if (
          (obj.activeTime !== "0" && obj.streamingTime !== "0") ||
          (obj.audiobookId !== "undefined" && obj.episodeId !== "undefined")
        ) {
          c += 1;
          insertedKeys.push(key);
          recordsString += temp;
        }
      }
      const queryString = `
        INSERT INTO kabbik_stream_session (
          user_id,
          audiobook_id,
          episode_id,
          date,
          created_at,
          updated_at,
          streaming_time,
          active_time,
          source
        )
        VALUES ${recordsString}`;
      if (c > 0) {
        const traillessQueryString = queryString.slice(
          0,
          queryString.length - 2
        );
        const queryResult = await DB.query(traillessQueryString);
        return { message: `${c} new records inserted.`, insertedKeys };
      }
      return { message: "No new records to insert." };
    } catch (err) {
      console.error(err);
      return { message: `Error occured during sync. ${err}` };
    }
  };

  saveBkashToken = async (token) => {
    try {
      const key = `bkashapp:${token}`;
      const data = await redisClient.set(key, 1);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  bkashTokenAvailability = async (req) => {
    try {
      const { token } = req.query;
      const key = `bkashapp:${token}`;
      const response = await redisClient.get(key);
                  return response !== null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  deleteBkashToken = async (req) => {
    try {
      const { token } = req.query;
      const key = `bkashapp:${token}`;
      const data = await redisClient.del(key);
            return { deleted: data };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  showAllKeys = async (req) => {
    try {
      const keys = await redisClient.keys("*");
      return keys;
    } catch (err) {
      console.error(err);
      throw new Error(`Error when reading keys in redis ${err}`);
    }
  };

  showKeysByPatternWithData = async (req) => {
    try {
      const params = {
        MATCH: req.query.pattern,
        COUNT: 1000,
      };
      let data = [];
      for await (const key of redisClient.scanIterator(params)) {
        const hashValue = await redisClient.hGetAll(key);
        data.push(hashValue);
      }
      return data;
    } catch (err) {
      console.error(err);
      throw new Error(`Error when reading keys by pattern with data in redis`);
    }
  };

  showKeysByPattern = async (req) => {
    try {
      const keys = await redisClient.keys(req.query.pattern);
      return keys;
    } catch (err) {
      console.error(err);
      throw new Error(`Error when reading keys by pattern in redis`);
    }
  };

  deleteKeysByPattern = async (req) => {
    try {
      const params = {
        MATCH: req.query.pattern,
        COUNT: 1000,
      };
      let deletedKeys = [];
      for await (const key of redisClient.scanIterator(params)) {
        await redisClient.del(key);
        deletedKeys.push(key);
      }
      return deletedKeys;
    } catch (err) {
      console.error(err);
      throw new Error(`Error when deleting keys by pattern in redis`);
    }
  };

  flushDb = async (req) => {
    try {
      const keys = await redisClient.flushDb();
      return keys;
    } catch (err) {
      throw new Error(`Error when reading keys in redis ${err}`);
    }
  };
}

module.exports = new RedisModel();
