const { createClient } = require("redis");
const { getRedisClientOptions } = require("./redis-options");

const redisClient = createClient(getRedisClientOptions());

const createConnection = async () => {
  try {
    redisClient
      .on("error", (err) => console.error("Redis error: ", err))
      .connect();
  } catch (err) {
    throw new Error("Error occured during creating client: ", err);
  } finally {
    // await redisClient.disconnect();
  }
};

if (process.env.NODE_ENV !== 'test') {
  createConnection();
}

module.exports = redisClient;
