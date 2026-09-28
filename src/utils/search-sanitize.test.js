const test = require('node:test');
const assert = require('node:assert/strict');

const { toBooleanModeQuery } = require('./search-sanitize');

test('toBooleanModeQuery turns tokens into prefix boolean-mode terms', () => {
  assert.equal(toBooleanModeQuery('podcast'), 'podcast*');
  assert.equal(toBooleanModeQuery('  atomic habits  '), 'atomic* habits*');
});

test('toBooleanModeQuery strips boolean-mode special characters', () => {
  assert.equal(toBooleanModeQuery('pod+cast'), 'pod* cast*');
  assert.equal(toBooleanModeQuery('foo-bar'), 'foo* bar*');
});

test('toBooleanModeQuery drops tokens shorter than min length', () => {
  assert.equal(toBooleanModeQuery('ab'), '');
  assert.equal(toBooleanModeQuery('go habits'), 'habits*');
});

test('toBooleanModeQuery returns empty for blank input', () => {
  assert.equal(toBooleanModeQuery(''), '');
  assert.equal(toBooleanModeQuery('   '), '');
  assert.equal(toBooleanModeQuery(null), '');
  assert.equal(toBooleanModeQuery(undefined), '');
});
