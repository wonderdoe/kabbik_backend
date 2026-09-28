const DB = require('../data/db');
const LoggerError = require('./logger-error');
const countCacheUtils = require('./podcast-count-cache-utils');

const DEFAULT_READ_BATCH_SIZE = 1000;
const DEFAULT_DURATION_WARN_MS = 120000;
const TRENDING_DECAY_DIVISOR = 45000;

const SELECT_BATCH_SQL = `SELECT id, like_count, view_count, created_at
  FROM podcast
  WHERE id > ?
  ORDER BY id ASC
  LIMIT ?`;

let recomputeInProgress = false;

const getReadBatchSize = () => {
  const parsed = parseInt(process.env.PODCAST_TRENDING_BATCH_SIZE || String(DEFAULT_READ_BATCH_SIZE), 10);
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_READ_BATCH_SIZE : parsed;
};

const getDurationWarnMs = () => {
  const parsed = parseInt(
    process.env.PODCAST_TRENDING_DURATION_WARN_MS || String(DEFAULT_DURATION_WARN_MS),
    10
  );
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_DURATION_WARN_MS : parsed;
};

const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

const computeTrendingScore = (likeCount, viewCount, createdAt) => {
  const engagement = (likeCount * 1) + (viewCount * 0.1);
  const epochSeconds = Math.floor(new Date(createdAt).getTime() / 1000);
  return Math.log10(Math.max(engagement, 1)) + (epochSeconds / TRENDING_DECAY_DIVISOR);
};

const bulkUpdateTrendingScores = async (scored) => {
  if (!scored || scored.length === 0) {
    return 0;
  }

  const caseClauses = scored.map(() => 'WHEN ? THEN ?').join(' ');
  const ids = scored.map((row) => row.id);
  const params = [];

  for (const row of scored) {
    params.push(row.id, row.score);
  }

  params.push(...ids);

  const result = await DB.query(
    `UPDATE podcast
     SET trending_score = CASE id ${caseClauses} END,
         trending_updated_at = NOW()
     WHERE id IN (${ids.map(() => '?').join(', ')})`,
    params
  );

  return result.affectedRows ?? 0;
};

async function recomputePodcastTrendingScores() {
  if (recomputeInProgress) {
    console.warn('[podcast-cron:trending] skipped reason=overlap');
    return { skipped: true, reason: 'overlap', affectedRows: 0 };
  }

  recomputeInProgress = true;
  const startMs = Date.now();
  const readBatchSize = getReadBatchSize();
  const rssStartMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

  try {
    let lastId = 0;
    let totalProcessed = 0;

    while (true) {
      const batch = await DB.query(SELECT_BATCH_SQL, [lastId, readBatchSize]);

      if (!batch || batch.length === 0) {
        break;
      }

      const withMergedCounts = await countCacheUtils.attachLiveCounts(batch);

      const scored = withMergedCounts.map((row) => ({
        id: row.id,
        score: computeTrendingScore(
          Number(row.like_count) || 0,
          Number(row.view_count) || 0,
          row.created_at
        ),
      }));

      await bulkUpdateTrendingScores(scored);

      lastId = batch[batch.length - 1].id;
      totalProcessed += batch.length;

      await yieldToEventLoop();
    }

    const durationMs = Date.now() - startMs;
    const rssEndMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.log(
      `[podcast-cron:trending] updated=${totalProcessed} duration=${durationMs}ms rss=${rssStartMb}MB->${rssEndMb}MB`
    );

    const durationWarnMs = getDurationWarnMs();
    if (durationMs > durationWarnMs) {
      console.warn(
        `[podcast-cron:trending] slow run duration=${durationMs}ms threshold=${durationWarnMs}ms updated=${totalProcessed}`
      );
    }

    return { skipped: false, affectedRows: totalProcessed, durationMs };
  } catch (err) {
    console.error('[podcast-cron:trending] failed:', err);
    LoggerError.log(err);
    throw err;
  } finally {
    recomputeInProgress = false;
  }
}

module.exports = {
  recomputePodcastTrendingScores,
  computeTrendingScore,
  bulkUpdateTrendingScores,
  getReadBatchSize,
  getDurationWarnMs,
  yieldToEventLoop,
  SELECT_BATCH_SQL,
  DEFAULT_READ_BATCH_SIZE,
  DEFAULT_DURATION_WARN_MS,
  TRENDING_DECAY_DIVISOR,
};
