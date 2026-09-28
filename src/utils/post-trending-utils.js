const DB = require('../data/db');
const LoggerError = require('./logger-error');

const RECOMPUTE_SQL = `UPDATE posts SET trending_score = LOG10(GREATEST(
  (like_count * 1) + (comment_count * 2) + (share_count * 3), 1
)) + (UNIX_TIMESTAMP(created_at) / 45000), trending_updated_at = NOW()
WHERE deleted = 0`;

let recomputeInProgress = false;

async function recomputeTrendingScores() {
  if (recomputeInProgress) {
    console.warn('[post-cron:trending] skipped reason=overlap');
    return { skipped: true, reason: 'overlap', affectedRows: 0 };
  }

  recomputeInProgress = true;
  const startMs = Date.now();

  try {
    const result = await DB.query(RECOMPUTE_SQL);
    const durationMs = Date.now() - startMs;
    const affectedRows = result.affectedRows ?? 0;
    console.log(`[post-cron:trending] updated=${affectedRows} duration=${durationMs}ms`);
    return { skipped: false, affectedRows, durationMs };
  } catch (err) {
    console.error('[post-cron:trending] failed:', err);
    LoggerError.log(err);
    throw err;
  } finally {
    recomputeInProgress = false;
  }
}

module.exports = {
  recomputeTrendingScores,
  RECOMPUTE_SQL,
};
