const getRedisClientOptions = () => {
  const isProduction = process.env.REDIS_ENV === 'production';

  const host = isProduction
    ? process.env.REDIS_HOST
    : process.env.REDIS_STAGING_HOST;
  const port = isProduction
    ? process.env.REDIS_PORT
    : process.env.REDIS_STAGING_PORT;
  const password = isProduction
    ? process.env.REDIS_PASSWORD
    : process.env.REDIS_STAGING_PASSWORD;
  const username = isProduction ? process.env.REDIS_USERNAME : undefined;
  const database = Number(
    isProduction
      ? process.env.REDIS_DB ?? 0
      : process.env.REDIS_STAGING_DB ?? 0,
  );

  const socket = {
    host,
    port: Number(port),
  };

  if (isProduction) {
    socket.tls = true;
  }

  const options = {
    socket,
    database,
    pingInterval: 10 * 1000,
  };

  if (username) {
    options.username = username;
  }

  if (password) {
    options.password = password;
  }

  return options;
};

module.exports = { getRedisClientOptions };
