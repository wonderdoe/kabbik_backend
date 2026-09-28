const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTagName,
  toTagSlug,
  dedupeTagsBySlug,
} = require('./podcast-tag-utils');

test('toTagSlug converts spaces to hyphens and lowercases', () => {
  assert.equal(toTagSlug('Tech News'), 'tech-news');
});

test('normalizeTagName trims and collapses whitespace', () => {
  assert.equal(normalizeTagName('  Tech   News  '), 'Tech News');
});

test('dedupeTagsBySlug collapses case-insensitive duplicates', () => {
  const tags = dedupeTagsBySlug(['Tech', 'tech', 'TECH']);

  assert.equal(tags.length, 1);
  assert.equal(tags[0].slug, 'tech');
  assert.equal(tags[0].name, 'Tech');
});

test('dedupeTagsBySlug skips empty tag strings', () => {
  const tags = dedupeTagsBySlug(['comedy', '   ', '']);

  assert.equal(tags.length, 1);
  assert.equal(tags[0].slug, 'comedy');
});
