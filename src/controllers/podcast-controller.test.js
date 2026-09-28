const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const PodcastModel = require('../data/models/podcast-model');
const PodcastController = require('../controllers/podcast-controller');
const countCacheUtils = require('../utils/podcast-count-cache-utils');

test.after(() => {
  DB.db.end();
});

const podcastRow = {
  id: 42,
  title: 'Test podcast',
  description: 'Desc',
  is_premium: 0,
  podcast_url: 'https://example.com/ep.mp3',
  thumb_url: 'https://example.com/ep-thumb.jpg',
  like_count: 1,
  dislike_count: 0,
  comment_count: 0,
  view_count: 5,
  user_reaction: null,
  created_at: '2026-08-25T10:30:00.000Z',
  updated_at: '2026-08-25T10:30:00.000Z',
};

const runGetPodcast = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message) => {
    res.statusCode = status;
    res.body = { message };
    return response;
  };

  try {
    await PodcastController.getPodcast(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

const runSearchPodcasts = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message) => {
    res.statusCode = status;
    res.body = { message };
    return response;
  };

  try {
    await PodcastController.searchPodcasts(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

const runListPodcasts = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message, code) => {
    res.statusCode = status;
    res.body = { message, code };
    return response;
  };

  try {
    await PodcastController.listPodcasts(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

const runCreatePodcast = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message) => {
    res.statusCode = status;
    res.body = { message };
    return response;
  };

  try {
    await PodcastController.createPodcast(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

const runUpdatePodcast = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message) => {
    res.statusCode = status;
    res.body = { message };
    return response;
  };

  try {
    await PodcastController.updatePodcast(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

test('searchPodcasts sanitizes query and passes prefix boolean mode to model', async (t) => {
  let capturedQuery = null;
  const originalSearch = PodcastModel.search;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.search = async ({ q }) => {
    capturedQuery = q;
    return { rows: [], total: 0 };
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.search = originalSearch;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runSearchPodcasts({
    query: { q: 'podcast' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedQuery, 'podcast*');
});

test('searchPodcasts nulls podcast_url but preserves thumb_url', async (t) => {
  const originalSearch = PodcastModel.search;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.search = async () => ({
    rows: [{ ...podcastRow, user_reaction: null }],
    total: 1,
  });
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.search = originalSearch;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runSearchPodcasts({
    query: { q: 'podcast' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.data[0].podcast_url, null);
  assert.equal(res.body.data[0].thumb_url, podcastRow.thumb_url);
});

test('listPodcasts passes trending sort to model', async (t) => {
  let capturedSort = null;
  const originalFindAll = PodcastModel.findAll;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findAll = async ({ sort }) => {
    capturedSort = sort;
    return { rows: [], total: 0 };
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findAll = originalFindAll;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runListPodcasts({
    query: { sort: 'trending' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedSort, 'trending');
});

test('listPodcasts combines trending sort with tag filter', async (t) => {
  let capturedSort = null;
  let capturedTagSlug = null;
  const originalFindAll = PodcastModel.findAll;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findAll = async ({ sort, tagSlug }) => {
    capturedSort = sort;
    capturedTagSlug = tagSlug;
    return { rows: [], total: 0 };
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findAll = originalFindAll;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runListPodcasts({
    query: { sort: 'trending', tag: 'technology' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedSort, 'trending');
  assert.equal(capturedTagSlug, 'technology');
});

test('listPodcasts rejects unknown sort value', async (t) => {
  const res = await runListPodcasts({
    query: { sort: 'bogus' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.code, 'INVALID_SORT');
});

test('listPodcasts defaults to recent sort when sort omitted', async (t) => {
  let capturedSort = null;
  const originalFindAll = PodcastModel.findAll;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findAll = async ({ sort }) => {
    capturedSort = sort;
    return { rows: [], total: 0 };
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findAll = originalFindAll;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runListPodcasts({
    query: {},
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedSort, 'recent');
});

test('listPodcasts nulls podcast_url but preserves thumb_url', async (t) => {
  const originalFindAll = PodcastModel.findAll;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findAll = async () => ({
    rows: [{ ...podcastRow, user_reaction: null }],
    total: 1,
  });
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findAll = originalFindAll;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runListPodcasts({
    query: {},
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.data[0].podcast_url, null);
  assert.equal(res.body.data[0].thumb_url, podcastRow.thumb_url);
});

test('createPodcast returns 400 when thumb_url is missing', async (t) => {
  const originalCreate = PodcastModel.createPodcast;
  PodcastModel.createPodcast = async () => {
    throw new Error('createPodcast should not be called');
  };

  t.after(() => {
    PodcastModel.createPodcast = originalCreate;
  });

  const res = await runCreatePodcast({
    body: {
      title: 'Episode title',
      podcast_url: 'https://cdn.example.com/ep.mp3',
    },
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.match(res.body.message, /thumb_url/i);
});

test('createPodcast returns 400 when thumb_url is empty', async (t) => {
  const originalCreate = PodcastModel.createPodcast;
  PodcastModel.createPodcast = async () => {
    throw new Error('createPodcast should not be called');
  };

  t.after(() => {
    PodcastModel.createPodcast = originalCreate;
  });

  const res = await runCreatePodcast({
    body: {
      title: 'Episode title',
      podcast_url: 'https://cdn.example.com/ep.mp3',
      thumb_url: '   ',
    },
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.match(res.body.message, /thumb_url/i);
});

test('createPodcast returns 201 with thumb_url when valid', async (t) => {
  const originalCreate = PodcastModel.createPodcast;
  const thumbUrl = 'https://cdn.example.com/new-thumb.jpg';

  PodcastModel.createPodcast = async (body) => ({
    podcast: { ...podcastRow, ...body, id: 99 },
    tags: [],
  });

  t.after(() => {
    PodcastModel.createPodcast = originalCreate;
  });

  const res = await runCreatePodcast({
    body: {
      title: 'Episode title',
      podcast_url: 'https://cdn.example.com/ep.mp3',
      thumb_url: thumbUrl,
    },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.equal(res.body.data.thumb_url, thumbUrl);
});

test('updatePodcast returns 400 when thumb_url is empty', async (t) => {
  const originalExists = PodcastModel.existsById;
  const originalUpdate = PodcastModel.updatePodcast;

  PodcastModel.existsById = async () => true;
  PodcastModel.updatePodcast = async () => {
    throw new Error('updatePodcast should not be called');
  };

  t.after(() => {
    PodcastModel.existsById = originalExists;
    PodcastModel.updatePodcast = originalUpdate;
  });

  const res = await runUpdatePodcast({
    params: { id: '42' },
    body: { thumb_url: '' },
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.match(res.body.message, /must not be empty/i);
});

test('searchPodcasts returns 400 when sanitization removes all tokens', async (t) => {
  const originalSearch = PodcastModel.search;
  PodcastModel.search = async () => {
    throw new Error('search should not be called');
  };

  t.after(() => {
    PodcastModel.search = originalSearch;
  });

  const res = await runSearchPodcasts({
    query: { q: 'ab' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.message, 'No valid search terms after sanitization');
});

test('getPodcast increments view_count only on successful fetch', async (t) => {
  let incrementCalls = 0;
  const originalFindById = PodcastModel.findById;
  const originalIncrement = countCacheUtils.incrementViewCountDelta;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findById = async () => ({
    podcast: podcastRow,
    tags: [],
  });
  countCacheUtils.incrementViewCountDelta = async (id) => {
    incrementCalls += 1;
    assert.equal(id, 42);
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findById = originalFindById;
    countCacheUtils.incrementViewCountDelta = originalIncrement;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runGetPodcast({
    params: { id: '42' },
    currentUser: { id: 1, is_subscribed: 1 },
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.data.id, 42);
  assert.equal(res.body.data.thumb_url, podcastRow.thumb_url);
  assert.equal(res.body.data.tags.length, 0);
  assert.equal(incrementCalls, 1);
});

test('getPodcast does not increment view_count on 404', async (t) => {
  let incrementCalls = 0;
  const originalFindById = PodcastModel.findById;
  const originalIncrement = countCacheUtils.incrementViewCountDelta;

  PodcastModel.findById = async () => null;
  countCacheUtils.incrementViewCountDelta = async () => {
    incrementCalls += 1;
  };

  t.after(() => {
    PodcastModel.findById = originalFindById;
    countCacheUtils.incrementViewCountDelta = originalIncrement;
  });

  const res = await runGetPodcast({
    params: { id: '999' },
    currentUser: { id: 1 },
  });

  assert.equal(res.statusCode, constants.HTTP_404);
  assert.equal(incrementCalls, 0);
});

test('getPodcast increments view_count on every successful request (no dedup)', async (t) => {
  let incrementCalls = 0;
  const originalFindById = PodcastModel.findById;
  const originalIncrement = countCacheUtils.incrementViewCountDelta;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findById = async () => ({
    podcast: podcastRow,
    tags: [],
  });
  countCacheUtils.incrementViewCountDelta = async () => {
    incrementCalls += 1;
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;

  t.after(() => {
    PodcastModel.findById = originalFindById;
    countCacheUtils.incrementViewCountDelta = originalIncrement;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const req = {
    params: { id: '42' },
    currentUser: { id: 1, is_subscribed: 1 },
  };

  await runGetPodcast(req);
  await runGetPodcast(req);

  assert.equal(incrementCalls, 2);
});

test('getPodcast increment failure does not change successful response', async (t) => {
  const originalFindById = PodcastModel.findById;
  const originalIncrement = countCacheUtils.incrementViewCountDelta;
  const originalAttach = countCacheUtils.attachLiveCounts;
  const originalConsoleError = console.error;

  PodcastModel.findById = async () => ({
    podcast: podcastRow,
    tags: [{ id: 1, name: 'Tech', slug: 'tech' }],
  });
  countCacheUtils.incrementViewCountDelta = async () => {
    throw new Error('increment failed');
  };
  countCacheUtils.attachLiveCounts = async (rows) => rows;
  console.error = () => {};

  t.after(() => {
    PodcastModel.findById = originalFindById;
    countCacheUtils.incrementViewCountDelta = originalIncrement;
    countCacheUtils.attachLiveCounts = originalAttach;
    console.error = originalConsoleError;
  });

  const res = await runGetPodcast({
    params: { id: '42' },
    currentUser: { id: 1, is_subscribed: 1 },
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.data.view_count, 5);
  assert.equal(res.body.data.tags.length, 1);
});

test('getPodcast returns live view_count from attachLiveCounts', async (t) => {
  const originalFindById = PodcastModel.findById;
  const originalIncrement = countCacheUtils.incrementViewCountDelta;
  const originalAttach = countCacheUtils.attachLiveCounts;

  PodcastModel.findById = async () => ({
    podcast: podcastRow,
    tags: [],
  });
  countCacheUtils.incrementViewCountDelta = async () => {};
  countCacheUtils.attachLiveCounts = async (rows) => rows.map((row) => ({
    ...row,
    view_count: row.view_count + 3,
  }));

  t.after(() => {
    PodcastModel.findById = originalFindById;
    countCacheUtils.incrementViewCountDelta = originalIncrement;
    countCacheUtils.attachLiveCounts = originalAttach;
  });

  const res = await runGetPodcast({
    params: { id: '42' },
    currentUser: { id: 1, is_subscribed: 1 },
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.data.view_count, 8);
});

test('runScheduledCountFlush skips on non-primary process', async (t) => {
  const originalName = process.env.name;
  process.env.name = 'worker-2';

  t.after(() => {
    process.env.name = originalName;
  });

  const result = await PodcastController.runScheduledCountFlush();
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'non_primary');
  assert.equal(result.flushed, 0);
  assert.equal(result.errors, 0);
});

test('runScheduledCountFlush skips when previous flush still running', async (t) => {
  const originalFlush = countCacheUtils.flushPendingCounts;
  let releaseFirst;
  const gate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  countCacheUtils.flushPendingCounts = async () => {
    await gate;
    return { flushed: 2, errors: 0 };
  };

  t.after(() => {
    countCacheUtils.flushPendingCounts = originalFlush;
  });

  const first = PodcastController.runScheduledCountFlush({ requirePrimary: false });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await PodcastController.runScheduledCountFlush({ requirePrimary: false });

  assert.equal(second.skipped, true);
  assert.equal(second.reason, 'overlap');

  releaseFirst();
  const firstResult = await first;
  assert.equal(firstResult.skipped, false);
  assert.equal(firstResult.flushed, 2);
  assert.equal(typeof firstResult.durationMs, 'number');
});

test('runScheduledCountFlush runs flush on primary process', async (t) => {
  const originalFlush = countCacheUtils.flushPendingCounts;
  const originalName = process.env.name;

  process.env.name = 'primary-kabbik-backend';
  countCacheUtils.flushPendingCounts = async () => ({ flushed: 5, errors: 0 });

  t.after(() => {
    countCacheUtils.flushPendingCounts = originalFlush;
    process.env.name = originalName;
  });

  const result = await PodcastController.runScheduledCountFlush();
  assert.equal(result.skipped, false);
  assert.equal(result.flushed, 5);
  assert.equal(result.errors, 0);
});

test('podcast router protects count-flush with authorizeAdmin', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/podcast-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(
    content,
    /router\.get\('\/cronjob\/count-flush', authorizeAdmin, PodcastController\.flushCountDeltas\)/
  );
});

test('podcast router schedules count flush cron when enabled', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/podcast-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(content, /PODCAST_COUNT_FLUSH_ENABLED/);
  assert.match(content, /PODCAST_COUNT_FLUSH_CRON/);
  assert.match(content, /runScheduledCountFlush/);
});

test('PodcastController.runScheduledTrendingRecompute skips on non-primary process', async (t) => {
  const originalName = process.env.name;
  process.env.name = 'worker-2';

  t.after(() => {
    process.env.name = originalName;
  });

  const result = await PodcastController.runScheduledTrendingRecompute();
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'non_primary');
});

test('podcast router protects recompute-trending with authorizeAdmin', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/podcast-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(
    content,
    /router\.get\(\s*['"]\/cronjob\/recompute-trending['"],\s*authorizeAdmin,\s*PodcastController\.recomputeTrendingScoresHandler\s*\)/
  );
});

test('podcast router schedules trending recompute cron when enabled', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/podcast-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(content, /PODCAST_TRENDING_RECOMPUTE_ENABLED/);
  assert.match(content, /PODCAST_TRENDING_RECOMPUTE_CRON/);
  assert.match(content, /runScheduledTrendingRecompute/);
});
