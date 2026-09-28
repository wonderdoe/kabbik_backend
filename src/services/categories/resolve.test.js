const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveFromData } = require('./resolveCore');

const baseCategories = [
  { id: 1, name: 'Fiction', deleted: 0 },
  { id: 2, name: 'History', deleted: 1 },
];

const ambiguousCategories = [
  ...baseCategories,
  { id: 3, name: 'fiction', deleted: 0 },
];

test('resolveFromData reuses existing categories and queues undelete', () => {
  const parsedRows = [
    { categoryName: 'Fiction', audiobookId: 10, rowNumber: 2 },
    { categoryName: 'History', audiobookId: 11, rowNumber: 3 },
    { categoryName: 'NewCat', audiobookId: 12, rowNumber: 4 },
  ];

  const result = resolveFromData(parsedRows, {
    categories: baseCategories,
    validAudiobookIds: new Set([10, 11, 12]),
  });

  assert.equal(result.categoriesToCreate.length, 1);
  assert.equal(result.categoriesToCreate[0].name, 'NewCat');
  assert.equal(result.categoriesToReuse.length, 2);
  assert.deepEqual(result.categoriesToUndelete, [2]);
  assert.equal(result.newLinks.length, 3);
});

test('resolveFromData flags ambiguous duplicate category names in database', () => {
  const parsedRows = [
    { categoryName: 'Fiction', audiobookId: 10, rowNumber: 2 },
  ];

  const result = resolveFromData(parsedRows, {
    categories: ambiguousCategories,
    validAudiobookIds: new Set([10]),
  });

  assert.equal(result.resolveErrors.length, 1);
  assert.match(result.resolveErrors[0].reason, /ambiguous/);
  assert.equal(result.newLinks.length, 0);
});

test('resolveFromData reports unmatched audiobooks and deduplicates links', () => {
  const parsedRows = [
    { categoryName: 'History', audiobookId: 99, rowNumber: 2 },
    { categoryName: 'History', audiobookId: 11, rowNumber: 3 },
    { categoryName: 'History', audiobookId: 11, rowNumber: 4 },
  ];

  const result = resolveFromData(parsedRows, {
    categories: [{ id: 2, name: 'History', deleted: 0 }],
    validAudiobookIds: new Set([11]),
  });

  assert.equal(result.unmatchedAudiobooks.length, 1);
  assert.equal(result.unmatchedAudiobooks[0].row, 2);
  assert.equal(result.newLinks.length, 1);
  assert.equal(result.newLinks[0].audiobookId, 11);
});
