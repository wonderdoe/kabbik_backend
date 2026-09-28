const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const trendingUtils = require('./post-trending-utils');

test('recomputeTrendingScores returns affectedRows from DB result', async (t) => {
  const originalQuery = DB.query;
  DB.query = async (sql) => {
    assert.equal(sql, trendingUtils.RECOMPUTE_SQL);
    return { affectedRows: 42 };
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  const result = await trendingUtils.recomputeTrendingScores();
  assert.equal(result.skipped, false);
  assert.equal(result.affectedRows, 42);
  assert.ok(typeof result.durationMs === 'number');
});

test('recomputeTrendingScores skips overlapping runs', async (t) => {
  const originalQuery = DB.query;
  let resolveQuery;
  const queryPromise = new Promise((resolve) => {
    resolveQuery = resolve;
  });

  DB.query = async () => {
    await queryPromise;
    return { affectedRows: 1 };
  };

  t.after(() => {
    DB.query = originalQuery;
    resolveQuery();
  });

  const first = trendingUtils.recomputeTrendingScores();
  const second = await trendingUtils.recomputeTrendingScores();

  assert.equal(second.skipped, true);
  assert.equal(second.reason, 'overlap');

  resolveQuery();
  await first;
});

test('recomputeTrendingScores rethrows on DB error', async (t) => {
  const originalQuery = DB.query;
  DB.query = async () => {
    throw new Error('db failure');
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  await assert.rejects(
    () => trendingUtils.recomputeTrendingScores(),
    /db failure/
  );
});

test.after(() => {
  DB.db.end();
});
