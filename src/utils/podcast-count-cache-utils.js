const redisClient = require('./redis-client');
const DB = require('../data/db');

const PENDING_FLUSH_SET = 'podcasts:pending_count_flush';

const likeCountDeltaKey = (id) => `podcast:${id}:like_count_delta`;
const dislikeCountDeltaKey = (id) => `podcast:${id}:dislike_count_delta`;
const viewCountDeltaKey = (id) => `podcast:${id}:view_count_delta`;

const parseDelta = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const incrementViewCountDelta = async (id) => {
  await redisClient
    .multi()
    .incr(viewCountDeltaKey(id))
    .sAdd(PENDING_FLUSH_SET, String(id))
    .exec();
};

const incrementReactionDeltas = async (id, likeDelta, dislikeDelta) => {
  if (likeDelta === 0 && dislikeDelta === 0) {
    return;
  }

  const multi = redisClient.multi();
  if (likeDelta !== 0) {
    multi.incrBy(likeCountDeltaKey(id), likeDelta);
  }
  if (dislikeDelta !== 0) {
    multi.incrBy(dislikeCountDeltaKey(id), dislikeDelta);
  }
  multi.sAdd(PENDING_FLUSH_SET, String(id));
  await multi.exec();
};

const attachLiveCounts = async (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }

  const ids = rows.map((row) => row.id);
  const likeKeys = ids.map(likeCountDeltaKey);
  const dislikeKeys = ids.map(dislikeCountDeltaKey);
  const viewKeys = ids.map(viewCountDeltaKey);

  let likeDeltas = [];
  let dislikeDeltas = [];
  let viewDeltas = [];

  try {
    [likeDeltas, dislikeDeltas, viewDeltas] = await Promise.all([
      redisClient.mGet(likeKeys),
      redisClient.mGet(dislikeKeys),
      redisClient.mGet(viewKeys),
    ]);
  } catch (err) {
    console.error('attachLiveCounts Redis error:', err);
    return rows;
  }

  return rows.map((row, index) => ({
    ...row,
    like_count: (Number(row.like_count) || 0) + parseDelta(likeDeltas[index]),
    dislike_count: (Number(row.dislike_count) || 0) + parseDelta(dislikeDeltas[index]),
    view_count: (Number(row.view_count) || 0) + parseDelta(viewDeltas[index]),
  }));
};

const flushPendingCounts = async () => {
  const ids = await redisClient.sMembers(PENDING_FLUSH_SET);
  if (!ids || ids.length === 0) {
    return { flushed: 0, errors: 0 };
  }

  let flushed = 0;
  let errors = 0;

  for (const idStr of ids) {
    const id = parseInt(idStr, 10);
    if (!id) {
      continue;
    }

    try {
      const [likeDelta, dislikeDelta, viewDelta] = await Promise.all([
        redisClient.getSet(likeCountDeltaKey(id), '0'),
        redisClient.getSet(dislikeCountDeltaKey(id), '0'),
        redisClient.getSet(viewCountDeltaKey(id), '0'),
      ]);

      const like = parseDelta(likeDelta);
      const dislike = parseDelta(dislikeDelta);
      const view = parseDelta(viewDelta);

      if (like !== 0 || dislike !== 0 || view !== 0) {
        await DB.query(
          `UPDATE podcast
           SET like_count = GREATEST(like_count + ?, 0),
               dislike_count = GREATEST(dislike_count + ?, 0),
               view_count = view_count + ?
           WHERE id = ?`,
          [like, dislike, view, id]
        );
      }

      const [newLike, newDislike, newView] = await Promise.all([
        redisClient.get(likeCountDeltaKey(id)),
        redisClient.get(dislikeCountDeltaKey(id)),
        redisClient.get(viewCountDeltaKey(id)),
      ]);

      const hasPending =
        parseDelta(newLike) !== 0 ||
        parseDelta(newDislike) !== 0 ||
        parseDelta(newView) !== 0;

      if (!hasPending) {
        await redisClient.sRem(PENDING_FLUSH_SET, idStr);
      }

      flushed += 1;
    } catch (err) {
      console.error(`flushPendingCounts failed for podcast ${idStr}:`, err);
      errors += 1;
    }
  }

  return { flushed, errors };
};

module.exports = {
  PENDING_FLUSH_SET,
  likeCountDeltaKey,
  dislikeCountDeltaKey,
  viewCountDeltaKey,
  parseDelta,
  incrementViewCountDelta,
  incrementReactionDeltas,
  attachLiveCounts,
  flushPendingCounts,
};
