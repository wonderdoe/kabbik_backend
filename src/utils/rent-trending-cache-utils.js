const redisClient = require('./redis-client');

const TRENDING_CACHE_TTL_SECONDS = 1800;

const trendingCacheKey = (months, page, limit) =>
  `cache:trending_rent:${months}:${page}:${limit}`;

const getTrendingCache = async (months, page, limit) => {
  try {
    const raw = await redisClient.get(trendingCacheKey(months, page, limit));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('getTrendingCache Redis error:', err);
    return null;
  }
};

const setTrendingCache = async (months, page, limit, responseObj) => {
  try {
    await redisClient.setEx(
      trendingCacheKey(months, page, limit),
      TRENDING_CACHE_TTL_SECONDS,
      JSON.stringify(responseObj)
    );
  } catch (err) {
    console.error('setTrendingCache Redis error:', err);
  }
};

module.exports = {
  TRENDING_CACHE_TTL_SECONDS,
  trendingCacheKey,
  getTrendingCache,
  setTrendingCache,
};
