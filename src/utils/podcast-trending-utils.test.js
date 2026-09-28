const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const countCacheUtils = require('./podcast-count-cache-utils');
const trendingUtils = require('./podcast-trending-utils');

const basePodcast = {
  id: 1,
  like_count: 10,
  view_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
};

const secondPodcast = {
  id: 2,
  like_count: 5,
  view_count: 10,
  created_at: '2026-02-01T00:00:00.000Z',
};

const isSelectBatchQuery = (sql) => sql.includes('WHERE id >') && sql.includes('ORDER BY id ASC');

test('computeTrendingScore ranks newer podcast higher with same engagement', () => {
  const olderScore = trendingUtils.computeTrendingScore(10, 0, '2026-01-01T00:00:00.000Z');
  const newerScore = trendingUtils.computeTrendingScore(10, 0, '2026-06-01T00:00:00.000Z');
  assert.ok(newerScore > olderScore);
});

test('recomputePodcastTrendingScores merges redis like delta into score', async (t) => {
  const originalQuery = DB.query;
  const originalAttach = countCacheUtils.attachLiveCounts;
  let updateSql = null;
  let updateParams = null;
  const selectCalls = [];

  DB.query = async (sql, params) => {
    if (isSelectBatchQuery(sql)) {
      selectCalls.push(params);
      if (params[0] === 0) {
        return [basePodcast];
      }
      return [];
    }
    if (sql.startsWith('UPDATE podcast')) {
      updateSql = sql;
      updateParams = params;
      return { affectedRows: 1 };
    }
    throw new Error(`unexpected query: ${sql}`);
  };

  countCacheUtils.attachLiveCounts = async (rows) => rows.map((row) => ({
    ...row,
    like_count: row.like_count + 50,
  }));

  t.after(() => {
    DB.query = originalQuery;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const result = await trendingUtils.recomputePodcastTrendingScores();
  assert.equal(result.skipped, false);
  assert.equal(result.affectedRows, 1);
  assert.deepEqual(selectCalls[0], [0, trendingUtils.getReadBatchSize()]);
  assert.ok(updateSql.includes('CASE id'));
  assert.ok(updateSql.includes('trending_updated_at = NOW()'));

  const dbOnlyScore = trendingUtils.computeTrendingScore(10, 0, basePodcast.created_at);
  const mergedScore = trendingUtils.computeTrendingScore(60, 0, basePodcast.created_at);
  assert.ok(mergedScore > dbOnlyScore);
  assert.equal(updateParams[1], mergedScore);
});

test('recomputePodcastTrendingScores paginates with keyset batches', async (t) => {
  const originalQuery = DB.query;
  const originalAttach = countCacheUtils.attachLiveCounts;
  const selectCalls = [];

  DB.query = async (sql, params) => {
    if (isSelectBatchQuery(sql)) {
      selectCalls.push(params);
      if (params[0] === 0) {
        return [basePodcast];
      }
      if (params[0] === 1) {
        return [secondPodcast];
      }
      return [];
    }
    if (sql.startsWith('UPDATE podcast')) {
      return { affectedRows: params.filter((_, i) => i % 2 === 0).length };
    }
    throw new Error(`unexpected query: ${sql}`);
  };

  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    DB.query = originalQuery;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const result = await trendingUtils.recomputePodcastTrendingScores();
  assert.equal(result.skipped, false);
  assert.equal(result.affectedRows, 2);
  assert.equal(selectCalls.length, 3);
  assert.deepEqual(selectCalls[0], [0, trendingUtils.getReadBatchSize()]);
  assert.deepEqual(selectCalls[1], [1, trendingUtils.getReadBatchSize()]);
  assert.deepEqual(selectCalls[2], [2, trendingUtils.getReadBatchSize()]);
});

test('recomputePodcastTrendingScores skips overlapping runs', async (t) => {
  const originalQuery = DB.query;
  let resolveQuery;
  const queryPromise = new Promise((resolve) => {
    resolveQuery = resolve;
  });

  DB.query = async (sql) => {
    if (isSelectBatchQuery(sql)) {
      await queryPromise;
      return [];
    }
    return { affectedRows: 0 };
  };

  t.after(() => {
    DB.query = originalQuery;
    resolveQuery();
  });

  const first = trendingUtils.recomputePodcastTrendingScores();
  const second = await trendingUtils.recomputePodcastTrendingScores();

  assert.equal(second.skipped, true);
  assert.equal(second.reason, 'overlap');

  resolveQuery();
  await first;
});

test('recomputePodcastTrendingScores rethrows on DB error', async (t) => {
  const originalQuery = DB.query;
  DB.query = async () => {
    throw new Error('db failure');
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  await assert.rejects(
    () => trendingUtils.recomputePodcastTrendingScores(),
    /db failure/
  );
});

test('recomputePodcastTrendingScores logs slow-run warning when duration exceeds threshold', async (t) => {
  const originalQuery = DB.query;
  const originalAttach = countCacheUtils.attachLiveCounts;
  const originalNow = Date.now;
  const originalWarn = console.warn;
  const warnings = [];
  let callCount = 0;

  console.warn = (...args) => {
    warnings.push(args.join(' '));
  };

  Date.now = () => {
    callCount += 1;
    if (callCount === 1) {
      return 0;
    }
    return trendingUtils.DEFAULT_DURATION_WARN_MS + 1;
  };

  DB.query = async (sql) => {
    if (isSelectBatchQuery(sql)) {
      return [];
    }
    return { affectedRows: 0 };
  };

  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    DB.query = originalQuery;
    countCacheUtils.attachLiveCounts = originalAttach;
    Date.now = originalNow;
    console.warn = originalWarn;
    delete process.env.PODCAST_TRENDING_DURATION_WARN_MS;
  });

  await trendingUtils.recomputePodcastTrendingScores();

  assert.ok(warnings.some((msg) => msg.includes('[podcast-cron:trending] slow run')));
});

test.after(() => {
  DB.db.end();
});
