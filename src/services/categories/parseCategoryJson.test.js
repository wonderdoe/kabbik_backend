const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCategoryJson } = require('./parseCategoryJson');

test('parseCategoryJson expands categories into link rows and keeps Bengali names', () => {
  const result = parseCategoryJson([
    { category_name: 'সাহিত্য', audiobook_ids: [36, 39], count: 2 },
    { category_name: 'ইসলামিক', audiobook_ids: [1149, 1283], count: 2 },
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].categoryName, 'সাহিত্য');
  assert.equal(result.rows[0].audiobookId, 36);
  assert.equal(result.rows[2].categoryName, 'ইসলামিক');
  assert.deepEqual(result.distinctCategoryNames, ['সাহিত্য', 'ইসলামিক']);
});

test('parseCategoryJson accepts wrapped categories array', () => {
  const result = parseCategoryJson({
    categories: [{ category_name: 'Holy Tunes', audiobook_ids: [2095] }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].categoryName, 'Holy Tunes');
});

test('parseCategoryJson deduplicates repeated ids within one category', () => {
  const result = parseCategoryJson([
    { category_name: 'সাহিত্য', audiobook_ids: [36, 36, 39] },
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 2);
});

test('parseCategoryJson collects bad ids and empty names without throwing', () => {
  const result = parseCategoryJson([
    { category_name: '', audiobook_ids: [10] },
    { category_name: 'কবিতা-গান', audiobook_ids: ['abc', 1250] },
    { category_name: 'ইতিহাস', audiobook_ids: 'not-an-array' },
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].audiobookId, 1250);
  assert.equal(result.parseErrors.length, 3);
  assert.equal(result.parseErrors[0].reason, 'empty category_name');
  assert.equal(result.parseErrors[1].reason, 'invalid audiobook_id');
  assert.equal(result.parseErrors[2].reason, 'audiobook_ids must be an array');
});

test('parseCategoryJson rejects non-array body', () => {
  const result = parseCategoryJson({ category_name: 'সাহিত্য' });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.message, /Invalid JSON body/);
});
