const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const PostModel = require('../data/models/post-model');
const PostTypeModel = require('../data/models/post-type-model');
const postStatsCache = require('../utils/post-stats-cache-utils');

const originalGetPostStats = postStatsCache.getPostStats;
const originalGetPostStatsBatch = postStatsCache.getPostStatsBatch;
const originalSetPostStats = postStatsCache.setPostStats;
const originalSetPostStatsBatch = postStatsCache.setPostStatsBatch;

postStatsCache.getPostStats = async () => null;
postStatsCache.getPostStatsBatch = async (postIds) => ({
  hits: new Map(),
  misses: postIds || [],
});
postStatsCache.setPostStats = async () => {};
postStatsCache.setPostStatsBatch = async () => {};

const PostController = require('./post-controller');
const PostTypeController = require('./post-type-controller');

test.after(() => {
  postStatsCache.getPostStats = originalGetPostStats;
  postStatsCache.getPostStatsBatch = originalGetPostStatsBatch;
  postStatsCache.setPostStats = originalSetPostStats;
  postStatsCache.setPostStatsBatch = originalSetPostStatsBatch;
  DB.db.end();
});

const samplePost = {
  id: 1,
  user_id: 7,
  content: 'hello',
  is_spoiler: false,
  post_type: { id: 3, name: 'Discussion', slug: 'discussion' },
  like_count: 0,
  comment_count: 0,
  share_count: 0,
  status: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  author: { user_name: 'user', full_name: 'User', image_url: null },
  audiobook: null,
};

const mockStatsCache = () => {
  const originalGetDb = PostModel.getStatsFromDb;
  PostModel.getStatsFromDb = async () => ({
    like_count: 0,
    comment_count: 0,
    share_count: 0,
  });

  return () => {
    PostModel.getStatsFromDb = originalGetDb;
  };
};

const runHandler = async (handler, req) => {
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
    res.body = { success: false, message, code };
    return response;
  };

  try {
    await handler(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

test('PostTypeController.getAll returns active types in list shape', async (t) => {
  const originalFindActiveList = PostTypeModel.findActiveList;
  PostTypeModel.findActiveList = async () => [
    { id: 1, name: 'Audio Book Review', slug: 'audiobook_review' },
    { id: 2, name: 'Question', slug: 'question' },
  ];

  t.after(() => {
    PostTypeModel.findActiveList = originalFindActiveList;
  });

  const res = await runHandler(PostTypeController.getAll, {});
  assert.equal(res.statusCode, constants.HTTP_200);
  assert.deepEqual(res.body.data, [
    { id: 1, name: 'Audio Book Review', slug: 'audiobook_review' },
    { id: 2, name: 'Question', slug: 'question' },
  ]);
});

test('PostController.create defaults to discussion and is_spoiler false', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  const originalCreate = PostModel.create;
  const originalFindById = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveBySlug = async (slug) => {
    assert.equal(slug, 'discussion');
    return { id: 3, name: 'Discussion', slug: 'discussion' };
  };
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => samplePost;

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveBySlug = originalFindBySlug;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { content: 'hello', title: 'Discussion topic' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.deepEqual(capturedCreateArgs, [7, 'hello', null, 3, false, 'Discussion topic']);
  assert.equal(res.body.data.post_type.slug, 'discussion');
  assert.equal(res.body.data.is_spoiler, false);
});

test('PostController.create requires title for discussion', async (t) => {
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  PostTypeModel.findActiveBySlug = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });

  t.after(() => {
    PostTypeModel.findActiveBySlug = originalFindBySlug;
  });

  const res = await runHandler(PostController.create, {
    body: { content: 'hello' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'TITLE_REQUIRED');
});

test('PostController.create passes title for discussion', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  const originalCreate = PostModel.create;
  const originalFindById = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveBySlug = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => ({
    ...samplePost,
    title: 'My discussion title',
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveBySlug = originalFindBySlug;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { content: 'body text', title: 'My discussion title' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.equal(capturedCreateArgs[5], 'My discussion title');
});

test('PostController.create rejects invalid post_type_id with 422', async (t) => {
  const originalFindById = PostTypeModel.findActiveById;
  PostTypeModel.findActiveById = async () => null;

  t.after(() => {
    PostTypeModel.findActiveById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 99, content: 'hello' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'INVALID_POST_TYPE');
});

test('PostController.create requires audiobook_id for audiobook_review', async (t) => {
  const originalFindById = PostTypeModel.findActiveById;
  PostTypeModel.findActiveById = async () => ({
    id: 1,
    name: 'Audio Book Review',
    slug: 'audiobook_review',
  });

  t.after(() => {
    PostTypeModel.findActiveById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 1, content: 'review' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'AUDIOBOOK_ID_REQUIRED');
});

test('PostController.create requires audiobook_id for audiobook_review when null', async (t) => {
  const originalFindById = PostTypeModel.findActiveById;
  PostTypeModel.findActiveById = async () => ({
    id: 1,
    name: 'Audio Book Review',
    slug: 'audiobook_review',
  });

  t.after(() => {
    PostTypeModel.findActiveById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 1, content: 'review', audiobook_id: null },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'AUDIOBOOK_ID_REQUIRED');
});

test('PostController.create allows audiobook_review with valid audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;
  const originalFindPost = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveById = async () => ({
    id: 1,
    name: 'Audio Book Review',
    slug: 'audiobook_review',
  });
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => ({
    ...samplePost,
    post_type: { id: 1, name: 'Audio Book Review', slug: 'audiobook_review' },
    audiobook: { id: 42, name: 'Book', thumb_path: '/thumb.jpg', author_name: 'Author' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindPost;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 1, content: 'great book', audiobook_id: 42 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.deepEqual(capturedCreateArgs, [7, 'great book', 42, 1, false, null]);
});

test('PostController.create returns 404 when audiobook_review references missing audiobook', async (t) => {
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;

  PostTypeModel.findActiveById = async () => ({
    id: 1,
    name: 'Audio Book Review',
    slug: 'audiobook_review',
  });
  PostModel.create = async () => ({ error: 'Audiobook not found' });

  t.after(() => {
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 1, content: 'review', audiobook_id: 999 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_404);
});

test('PostController.create allows question without audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;
  const originalFindPost = PostModel.findById;

  PostTypeModel.findActiveById = async () => ({
    id: 2,
    name: 'Question',
    slug: 'question',
  });
  PostModel.create = async () => ({ id: 1 });
  PostModel.findById = async () => ({
    ...samplePost,
    post_type: { id: 2, name: 'Question', slug: 'question' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindPost;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 2, content: 'why?' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
});

test('PostController.create allows question with optional audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;
  const originalFindPost = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveById = async () => ({
    id: 2,
    name: 'Question',
    slug: 'question',
  });
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => ({
    ...samplePost,
    post_type: { id: 2, name: 'Question', slug: 'question' },
    audiobook: { id: 42, name: 'Book', thumb_path: '/thumb.jpg', author_name: 'Author' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindPost;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 2, content: 'why?', audiobook_id: 42 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.deepEqual(capturedCreateArgs, [7, 'why?', 42, 2, false, null]);
});

test('PostController.create allows recommendation without audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;
  const originalFindPost = PostModel.findById;

  PostTypeModel.findActiveById = async () => ({
    id: 4,
    name: 'Recommendation',
    slug: 'recommendation',
  });
  PostModel.create = async () => ({ id: 1 });
  PostModel.findById = async () => ({
    ...samplePost,
    post_type: { id: 4, name: 'Recommendation', slug: 'recommendation' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindPost;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 4, content: 'you should read this' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
});

test('PostController.create allows recommendation with optional audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindById = PostTypeModel.findActiveById;
  const originalCreate = PostModel.create;
  const originalFindPost = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveById = async () => ({
    id: 4,
    name: 'Recommendation',
    slug: 'recommendation',
  });
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => ({
    ...samplePost,
    post_type: { id: 4, name: 'Recommendation', slug: 'recommendation' },
    audiobook: { id: 42, name: 'Book', thumb_path: '/thumb.jpg', author_name: 'Author' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveById = originalFindById;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindPost;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 4, content: 'you should read this', audiobook_id: 42 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.deepEqual(capturedCreateArgs, [7, 'you should read this', 42, 4, false, null]);
});

test('PostController.create allows discussion with optional audiobook_id', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  const originalCreate = PostModel.create;
  const originalFindById = PostModel.findById;
  let capturedCreateArgs = null;

  PostTypeModel.findActiveBySlug = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });
  PostModel.create = async (...args) => {
    capturedCreateArgs = args;
    return { id: 1 };
  };
  PostModel.findById = async () => ({
    ...samplePost,
    title: 'Discussion topic',
    audiobook: { id: 42, name: 'Book', thumb_path: '/thumb.jpg', author_name: 'Author' },
  });

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveBySlug = originalFindBySlug;
    PostModel.create = originalCreate;
    PostModel.findById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { content: 'hello', title: 'Discussion topic', audiobook_id: 42 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_201);
  assert.deepEqual(capturedCreateArgs, [7, 'hello', 42, 3, false, 'Discussion topic']);
});

test('PostController.create rejects title for non-discussion post types', async (t) => {
  const originalFindById = PostTypeModel.findActiveById;
  PostTypeModel.findActiveById = async () => ({
    id: 2,
    name: 'Question',
    slug: 'question',
  });

  t.after(() => {
    PostTypeModel.findActiveById = originalFindById;
  });

  const res = await runHandler(PostController.create, {
    body: { post_type_id: 2, content: 'why?', title: 'Not allowed' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'TITLE_NOT_ALLOWED');
});

test('PostController.getAll rejects unknown post_type filter', async (t) => {
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  PostTypeModel.findActiveBySlug = async () => null;

  t.after(() => {
    PostTypeModel.findActiveBySlug = originalFindBySlug;
  });

  const res = await runHandler(PostController.getAll, {
    query: { post_type: 'unknown' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.code, 'INVALID_POST_TYPE_FILTER');
});

test('PostController.getAll filters by post_type slug', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  const originalFindAll = PostModel.findAll;
  let capturedPostTypeId = null;

  PostTypeModel.findActiveBySlug = async (slug) => {
    assert.equal(slug, 'question');
    return { id: 2, name: 'Question', slug: 'question' };
  };
  PostModel.findAll = async (page, pageSize, userId, postTypeId) => {
    capturedPostTypeId = postTypeId;
    return { data: [samplePost], total: 1, page, pageSize };
  };

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveBySlug = originalFindBySlug;
    PostModel.findAll = originalFindAll;
  });

  const res = await runHandler(PostController.getAll, {
    query: { post_type: 'question' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedPostTypeId, 2);
  assert.equal(res.body.data[0].post_type.slug, 'discussion');
});

test('PostController.getAll defaults to recent sort', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindAll = PostModel.findAll;
  let capturedSort = null;

  PostModel.findAll = async (page, pageSize, userId, postTypeId, sort) => {
    capturedSort = sort;
    return { data: [samplePost], total: 1, page, pageSize };
  };

  t.after(() => {
    restoreStats();
    PostModel.findAll = originalFindAll;
  });

  const res = await runHandler(PostController.getAll, {
    query: {},
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedSort, 'recent');
});

test('PostController.getAll passes trending sort to model', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindAll = PostModel.findAll;
  let capturedSort = null;

  PostModel.findAll = async (page, pageSize, userId, postTypeId, sort) => {
    capturedSort = sort;
    return { data: [samplePost], total: 1, page, pageSize };
  };

  t.after(() => {
    restoreStats();
    PostModel.findAll = originalFindAll;
  });

  const res = await runHandler(PostController.getAll, {
    query: { sort: 'trending' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedSort, 'trending');
  assert.equal(res.body.data[0].post_type.slug, 'discussion');
});

test('PostController.getAll combines trending sort with post_type filter', async (t) => {
  const restoreStats = mockStatsCache();
  const originalFindBySlug = PostTypeModel.findActiveBySlug;
  const originalFindAll = PostModel.findAll;
  let capturedPostTypeId = null;
  let capturedSort = null;

  PostTypeModel.findActiveBySlug = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });
  PostModel.findAll = async (page, pageSize, userId, postTypeId, sort) => {
    capturedPostTypeId = postTypeId;
    capturedSort = sort;
    return { data: [samplePost], total: 1, page, pageSize };
  };

  t.after(() => {
    restoreStats();
    PostTypeModel.findActiveBySlug = originalFindBySlug;
    PostModel.findAll = originalFindAll;
  });

  const res = await runHandler(PostController.getAll, {
    query: { sort: 'trending', post_type: 'discussion' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(capturedPostTypeId, 3);
  assert.equal(capturedSort, 'trending');
});

test('PostController.getAll rejects unknown sort value', async (t) => {
  const res = await runHandler(PostController.getAll, {
    query: { sort: 'bogus' },
    currentUser: null,
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.code, 'INVALID_SORT');
});

test('PostController.runScheduledTrendingRecompute skips on non-primary process', async (t) => {
  const originalName = process.env.name;
  process.env.name = 'worker-2';

  t.after(() => {
    process.env.name = originalName;
  });

  const result = await PostController.runScheduledTrendingRecompute();
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'non_primary');
});

test('post router protects recompute-trending with authorizeAdmin', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/post-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(
    content,
    /router\.get\('\/cronjob\/recompute-trending', authorizeAdmin, PostController\.recomputeTrendingScoresHandler\)/
  );
});

test('post router schedules trending recompute cron when enabled', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../routers/v1/post-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  assert.match(content, /POST_TRENDING_RECOMPUTE_ENABLED/);
  assert.match(content, /POST_TRENDING_RECOMPUTE_CRON/);
  assert.match(content, /runScheduledTrendingRecompute/);
});

test('PostController.update toggles is_spoiler for owner', async (t) => {
  const restoreStats = mockStatsCache();
  const originalGetRawPost = PostModel.getRawPost;
  const originalUpdatePost = PostModel.updatePost;
  const originalFindById = PostModel.findById;
  const originalIsLiked = PostModel.isLikedByUser;
  let capturedUpdate = null;

  PostModel.getRawPost = async () => ({ id: 1, user_id: 7, post_type_id: 3 });
  PostModel.updatePost = async (postId, updates) => {
    capturedUpdate = { postId, updates };
    return true;
  };
  PostModel.findById = async () => ({ ...samplePost, is_spoiler: true });
  PostModel.isLikedByUser = async () => false;

  t.after(() => {
    restoreStats();
    PostModel.getRawPost = originalGetRawPost;
    PostModel.updatePost = originalUpdatePost;
    PostModel.findById = originalFindById;
    PostModel.isLikedByUser = originalIsLiked;
  });

  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { is_spoiler: true },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.deepEqual(capturedUpdate, { postId: 1, updates: { isSpoiler: true } });
  assert.equal(res.body.data.is_spoiler, true);
});

test('PostController.update updates title only', async (t) => {
  const restoreStats = mockStatsCache();
  const originalGetRawPost = PostModel.getRawPost;
  const originalUpdatePost = PostModel.updatePost;
  const originalFindById = PostModel.findById;
  const originalFindActiveById = PostTypeModel.findActiveById;
  const originalIsLiked = PostModel.isLikedByUser;
  let capturedUpdate = null;

  PostModel.getRawPost = async () => ({ id: 1, user_id: 7, post_type_id: 3 });
  PostTypeModel.findActiveById = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });
  PostModel.updatePost = async (postId, updates) => {
    capturedUpdate = { postId, updates };
    return true;
  };
  PostModel.findById = async () => ({
    ...samplePost,
    title: 'Updated title',
  });
  PostModel.isLikedByUser = async () => false;

  t.after(() => {
    restoreStats();
    PostModel.getRawPost = originalGetRawPost;
    PostModel.updatePost = originalUpdatePost;
    PostModel.findById = originalFindById;
    PostTypeModel.findActiveById = originalFindActiveById;
    PostModel.isLikedByUser = originalIsLiked;
  });

  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { title: 'Updated title' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_200);
  assert.deepEqual(capturedUpdate, {
    postId: 1,
    updates: { title: 'Updated title' },
  });
  assert.equal(res.body.data.title, 'Updated title');
});

test('PostController.update rejects audiobook_id changes', async (t) => {
  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { is_spoiler: true, audiobook_id: 5 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.code, 'IMMUTABLE_FIELD');
});

test('PostController.update rejects title for non-discussion posts', async (t) => {
  const originalGetRawPost = PostModel.getRawPost;
  const originalFindActiveById = PostTypeModel.findActiveById;

  PostModel.getRawPost = async () => ({ id: 1, user_id: 7, post_type_id: 2 });
  PostTypeModel.findActiveById = async () => ({
    id: 2,
    name: 'Question',
    slug: 'question',
  });

  t.after(() => {
    PostModel.getRawPost = originalGetRawPost;
    PostTypeModel.findActiveById = originalFindActiveById;
  });

  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { title: 'Not allowed' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'TITLE_NOT_ALLOWED');
});

test('PostController.update rejects empty title for discussion', async (t) => {
  const originalGetRawPost = PostModel.getRawPost;
  const originalFindActiveById = PostTypeModel.findActiveById;

  PostModel.getRawPost = async () => ({ id: 1, user_id: 7, post_type_id: 3 });
  PostTypeModel.findActiveById = async () => ({
    id: 3,
    name: 'Discussion',
    slug: 'discussion',
  });

  t.after(() => {
    PostModel.getRawPost = originalGetRawPost;
    PostTypeModel.findActiveById = originalFindActiveById;
  });

  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { title: '' },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_422);
  assert.equal(res.body.code, 'TITLE_REQUIRED');
});

test('PostController.update rejects post_type_id changes', async (t) => {
  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { is_spoiler: true, post_type_id: 2 },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, constants.HTTP_400);
  assert.equal(res.body.code, 'IMMUTABLE_FIELD');
});

test('PostController.update returns forbidden for non-owner', async (t) => {
  const originalGetRawPost = PostModel.getRawPost;
  PostModel.getRawPost = async () => ({ id: 1, user_id: 99 });

  t.after(() => {
    PostModel.getRawPost = originalGetRawPost;
  });

  const res = await runHandler(PostController.update, {
    params: { id: '1' },
    body: { is_spoiler: true },
    currentUser: { id: 7 },
  });

  assert.equal(res.statusCode, 403);
});

test('PostModel.mapPostRow includes title only for discussion', () => {
  const discussion = PostModel.mapPostRow({
    id: 42,
    user_id: 7,
    audiobook_id: null,
    title: 'Discussion title',
    content: 'text',
    is_spoiler: 0,
    like_count: 1,
    comment_count: 0,
    share_count: 0,
    status: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    post_type_id: 3,
    post_type_name: 'Discussion',
    post_type_slug: 'discussion',
    user_name: 'user',
    full_name: 'User',
    image_url: null,
    audiobook_name: null,
    audiobook_thumb_path: null,
    audiobook_author_name: null,
  });

  assert.equal(discussion.title, 'Discussion title');
});

test('PostModel.mapPostRow includes post_type object and is_spoiler', () => {
  const mapped = PostModel.mapPostRow({
    id: 42,
    user_id: 7,
    audiobook_id: null,
    title: 'A question title',
    content: 'text',
    is_spoiler: 1,
    like_count: 1,
    comment_count: 0,
    share_count: 0,
    status: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    post_type_id: 2,
    post_type_name: 'Question',
    post_type_slug: 'question',
    user_name: 'user',
    full_name: 'User',
    image_url: null,
    audiobook_name: null,
    audiobook_thumb_path: null,
    audiobook_author_name: null,
  });

  assert.equal(mapped.is_spoiler, true);
  assert.equal(mapped.title, null);
  assert.deepEqual(mapped.post_type, {
    id: 2,
    name: 'Question',
    slug: 'question',
  });
  assert.equal(mapped.post_type_id, undefined);
});
