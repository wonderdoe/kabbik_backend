const redisClient = require('./redis-client');

const TTL_SECONDS = 300;

const statsKey = (postId) => `post:${postId}:stats`;

const getPostStats = async (postId) => {
  try {
    const raw = await redisClient.get(statsKey(postId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('getPostStats Redis error:', err);
    return null;
  }
};

const getPostStatsBatch = async (postIds) => {
  const hits = new Map();
  const misses = [];

  if (!postIds || postIds.length === 0) {
    return { hits, misses };
  }

  try {
    const keys = postIds.map(statsKey);
    const values = await redisClient.mGet(keys);

    postIds.forEach((postId, index) => {
      const raw = values[index];
      if (raw) {
        try {
          hits.set(postId, JSON.parse(raw));
        } catch (parseErr) {
          misses.push(postId);
        }
      } else {
        misses.push(postId);
      }
    });
  } catch (err) {
    console.error('getPostStatsBatch Redis error:', err);
    return { hits, misses: [...postIds] };
  }

  return { hits, misses };
};

const setPostStats = async (postId, stats) => {
  try {
    await redisClient.setEx(statsKey(postId), TTL_SECONDS, JSON.stringify(stats));
  } catch (err) {
    console.error('setPostStats Redis error:', err);
  }
};

const setPostStatsBatch = async (entries) => {
  if (!entries || entries.length === 0) return;

  try {
    const pipeline = redisClient.multi();
    entries.forEach(({ postId, stats }) => {
      pipeline.setEx(statsKey(postId), TTL_SECONDS, JSON.stringify(stats));
    });
    await pipeline.exec();
  } catch (err) {
    console.error('setPostStatsBatch Redis error:', err);
  }
};

const invalidatePostStats = async (postId) => {
  try {
    await redisClient.del(statsKey(postId));
  } catch (err) {
    console.error('invalidatePostStats Redis error:', err);
  }
};

module.exports = {
  statsKey,
  getPostStats,
  getPostStatsBatch,
  setPostStats,
  setPostStatsBatch,
  invalidatePostStats,
};
