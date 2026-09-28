const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../db');
const PodcastModel = require('./podcast-model');

test.after(() => {
  DB.db.end();
});

const sampleListRow = {
  id: 1,
  title: 'Test',
  description: 'Desc',
  is_premium: 0,
  podcast_url: 'https://example.com/ep.mp3',
  thumb_url: 'https://example.com/ep-thumb.jpg',
  like_count: 0,
  dislike_count: 0,
  comment_count: 0,
  view_count: 0,
  user_reaction: null,
};

const countPlaceholders = (sql) => (sql.match(/\?/g) || []).length;

const withMockedQuery = async (t, handler) => {
  const captured = [];
  const originalQuery = DB.query;
  DB.query = async (sql, params) => {
    captured.push({ sql, params });
    return handler(sql, params, captured);
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  return captured;
};

test('findAll trending sort orders by trending_score DESC, id DESC', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 1 }];
    }
    return [{ ...sampleListRow }];
  });

  await PodcastModel.findAll({
    page: 1,
    limit: 10,
    tagSlug: null,
    userId: null,
    sort: 'trending',
  });

  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));
  assert.match(listQuery.sql, /p\.trending_score/);
  assert.match(listQuery.sql, /ORDER BY p\.trending_score DESC, p\.id DESC/);
});

test('findAll recent sort orders by id DESC', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 1 }];
    }
    return [{ ...sampleListRow }];
  });

  await PodcastModel.findAll({
    page: 1,
    limit: 10,
    tagSlug: null,
    userId: null,
    sort: 'recent',
  });

  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));
  assert.match(listQuery.sql, /ORDER BY p\.id DESC/);
  assert.doesNotMatch(listQuery.sql, /trending_score/);
});

test('findAll anonymous: count has no reaction join, list uses NULL user_reaction', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 5 }];
    }
    return [{ ...sampleListRow, user_reaction: null }];
  });

  const result = await PodcastModel.findAll({
    page: 1,
    limit: 10,
    tagSlug: null,
    userId: null,
  });

  const countQuery = captured.find((q) => q.sql.includes('COUNT(DISTINCT'));
  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));

  assert.ok(countQuery);
  assert.ok(listQuery);
  assert.equal(countQuery.sql.includes('podcast_reaction'), false);
  assert.equal(listQuery.sql.includes('podcast_reaction'), false);
  assert.match(listQuery.sql, /NULL AS user_reaction/);
  assert.match(listQuery.sql, /p\.thumb_url/);
  assert.equal(countPlaceholders(countQuery.sql), countQuery.params.length);
  assert.equal(countPlaceholders(listQuery.sql), listQuery.params.length);
  assert.deepEqual(listQuery.params, [10, 0]);
  assert.equal(result.total, 5);
  assert.equal(result.rows[0].user_reaction, null);
  assert.equal(result.rows[0].thumb_url, sampleListRow.thumb_url);
});

test('findAll authenticated: list joins reaction, count does not', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 2 }];
    }
    return [{ ...sampleListRow, user_reaction: 'like' }];
  });

  await PodcastModel.findAll({
    page: 1,
    limit: 10,
    tagSlug: null,
    userId: 42,
  });

  const countQuery = captured.find((q) => q.sql.includes('COUNT(DISTINCT'));
  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));

  assert.equal(countQuery.sql.includes('podcast_reaction'), false);
  assert.equal(listQuery.sql.includes('podcast_reaction'), true);
  assert.match(listQuery.sql, /pr\.reaction_type AS user_reaction/);
  assert.deepEqual(countQuery.params, []);
  assert.deepEqual(listQuery.params, [42, 10, 0]);
  assert.equal(countPlaceholders(countQuery.sql), countQuery.params.length);
  assert.equal(countPlaceholders(listQuery.sql), listQuery.params.length);
});

test('findAll tag filter + auth: count params exclude userId', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 1 }];
    }
    return [{ ...sampleListRow, user_reaction: 'dislike' }];
  });

  await PodcastModel.findAll({
    page: 1,
    limit: 10,
    tagSlug: 'technology',
    userId: 99,
  });

  const countQuery = captured.find((q) => q.sql.includes('COUNT(DISTINCT'));
  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));

  assert.match(countQuery.sql, /t\.slug = \?/);
  assert.deepEqual(countQuery.params, ['technology']);
  assert.deepEqual(listQuery.params, ['technology', 99, 10, 0]);
  assert.equal(countPlaceholders(countQuery.sql), countQuery.params.length);
  assert.equal(countPlaceholders(listQuery.sql), listQuery.params.length);
});

test('findAll pagination: page 2 uses correct offset and returns count total', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(DISTINCT')) {
      return [{ total: 25 }];
    }
    return [];
  });

  const result = await PodcastModel.findAll({
    page: 2,
    limit: 10,
    tagSlug: null,
    userId: 7,
  });

  const listQuery = captured.find((q) => q.sql.includes('SELECT DISTINCT'));
  assert.deepEqual(listQuery.params, [7, 10, 10]);
  assert.equal(result.total, 25);
  assert.deepEqual(result.rows, []);
});

test('search anonymous: count has no reaction join, list uses NULL user_reaction', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(*)')) {
      return [{ total: 3 }];
    }
    return [{ ...sampleListRow, user_reaction: null }];
  });

  const result = await PodcastModel.search({
    q: 'habits',
    page: 1,
    limit: 10,
    userId: null,
  });

  const countQuery = captured.find((q) => q.sql.includes('COUNT(*)'));
  const listQuery = captured.find((q) => q.sql.includes('AS relevance'));

  assert.ok(countQuery);
  assert.ok(listQuery);
  assert.match(countQuery.sql, /IN BOOLEAN MODE/);
  assert.match(listQuery.sql, /MATCH\(p\.title, p\.description\)/);
  assert.equal(countQuery.sql.includes('podcast_reaction'), false);
  assert.equal(listQuery.sql.includes('podcast_reaction'), false);
  assert.equal(countQuery.sql.includes('episode_id'), false);
  assert.equal(listQuery.sql.includes('episode_id'), false);
  assert.match(listQuery.sql, /p\.thumb_url/);
  assert.match(listQuery.sql, /NULL AS user_reaction/);
  assert.deepEqual(countQuery.params, ['habits']);
  assert.deepEqual(listQuery.params, ['habits', 'habits', 10, 0]);
  assert.equal(countPlaceholders(countQuery.sql), countQuery.params.length);
  assert.equal(countPlaceholders(listQuery.sql), listQuery.params.length);
  assert.equal(result.total, 3);
  assert.equal(result.rows[0].user_reaction, null);
  assert.equal(result.rows[0].thumb_url, sampleListRow.thumb_url);
});

test('search authenticated: list joins reaction, count does not', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(*)')) {
      return [{ total: 2 }];
    }
    return [{ ...sampleListRow, user_reaction: 'like' }];
  });

  await PodcastModel.search({
    q: 'podcast',
    page: 1,
    limit: 10,
    userId: 42,
  });

  const countQuery = captured.find((q) => q.sql.includes('COUNT(*)'));
  const listQuery = captured.find((q) => q.sql.includes('AS relevance'));

  assert.equal(countQuery.sql.includes('podcast_reaction'), false);
  assert.equal(listQuery.sql.includes('podcast_reaction'), true);
  assert.match(listQuery.sql, /pr\.reaction_type AS user_reaction/);
  assert.deepEqual(countQuery.params, ['podcast']);
  assert.deepEqual(listQuery.params, ['podcast', 42, 'podcast', 10, 0]);
  assert.equal(countPlaceholders(countQuery.sql), countQuery.params.length);
  assert.equal(countPlaceholders(listQuery.sql), listQuery.params.length);
});

test('search short query returns empty results (ft_min_word_len behavior)', async (t) => {
  await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(*)')) {
      return [{ total: 0 }];
    }
    return [];
  });

  const result = await PodcastModel.search({
    q: 'ab',
    page: 1,
    limit: 10,
    userId: null,
  });

  assert.equal(result.total, 0);
  assert.deepEqual(result.rows, []);
});

test('podcast router registers /search before /:id routes', () => {
  const fs = require('fs');
  const path = require('path');
  const routerPath = path.join(__dirname, '../../routers/v1/podcast-router.js');
  const content = fs.readFileSync(routerPath, 'utf8');

  const searchPos = content.indexOf("router.get('/search'");
  const idPos = content.indexOf("router.get('/:id',");
  const similarPos = content.indexOf("router.get('/:id/similar'");

  assert.ok(searchPos >= 0, '/search route should be registered');
  assert.ok(idPos >= 0, '/:id route should be registered');
  assert.ok(similarPos >= 0, '/:id/similar route should be registered');
  assert.ok(searchPos < idPos, '/search must be registered before /:id');
  assert.ok(searchPos < similarPos, '/search must be registered before /:id/similar');
});

test('incrementViewCount runs atomic UPDATE', async (t) => {
  const captured = await withMockedQuery(t, () => []);

  await PodcastModel.incrementViewCount(42);

  assert.equal(captured.length, 1);
  assert.match(captured[0].sql, /UPDATE podcast SET view_count = view_count \+ 1 WHERE id = \?/);
  assert.deepEqual(captured[0].params, [42]);
});

test('incrementViewCount supports concurrent calls without read-then-write', async (t) => {
  let updateCount = 0;
  const captured = await withMockedQuery(t, () => {
    updateCount += 1;
    return [];
  });

  await Promise.all(
    Array.from({ length: 10 }, () => PodcastModel.incrementViewCount(7))
  );

  assert.equal(updateCount, 10);
  assert.equal(captured.length, 10);
  captured.forEach((query) => {
    assert.match(query.sql, /view_count = view_count \+ 1/);
    assert.deepEqual(query.params, [7]);
  });
});

test('findById selects created_at and updated_at', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('FROM podcast_tag')) {
      return [];
    }
    return [{
      ...sampleListRow,
      created_at: new Date('2026-08-25T10:30:00.000Z'),
      updated_at: new Date('2026-08-25T12:00:00.000Z'),
      user_reaction: null,
    }];
  });

  const result = await PodcastModel.findById(1, null);
  const detailQuery = captured.find((q) => q.sql.includes('FROM podcast p'));

  assert.match(detailQuery.sql, /p\.created_at, p\.updated_at/);
  assert.equal(result.podcast.view_count, 0);
  assert.equal(result.podcast.created_at, '2026-08-25T10:30:00.000Z');
  assert.equal(result.podcast.updated_at, '2026-08-25T12:00:00.000Z');
  assert.equal(result.podcast.thumb_url, sampleListRow.thumb_url);
});

test('findSimilar GROUP BY includes thumb_url', async (t) => {
  const captured = await withMockedQuery(t, (sql) => {
    if (sql.includes('COUNT(*)')) {
      return [{ total: 1 }];
    }
    return [{ ...sampleListRow, shared_tag_count: 2, user_reaction: null }];
  });

  await PodcastModel.findSimilar(1, {
    page: 1,
    limit: 10,
    userId: null,
  });

  const listQuery = captured.find((q) => q.sql.includes('shared_tag_count'));
  assert.match(listQuery.sql, /p\.thumb_url/);
  assert.match(listQuery.sql, /GROUP BY[\s\S]*p\.thumb_url/);
});
