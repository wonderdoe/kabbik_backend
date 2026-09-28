const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseWorkbook } = require('./parseWorkbook');

const makeWorkbookBuffer = (rows) => {
  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

test('parseWorkbook accepts long format with category_name and audiobook_id', () => {
  const buffer = makeWorkbookBuffer([
    ['category_name', 'audiobook_id', 'audiobook_name'],
    ['Fiction', 101, 'Book A'],
    ['fiction', 102, 'Book B'],
    ['Drama', 103, ''],
  ]);

  const result = parseWorkbook(buffer);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].categoryName, 'Fiction');
  assert.equal(result.rows[1].categoryName, 'Fiction');
  assert.equal(result.distinctCategoryNames.length, 2);
  assert.deepEqual(result.distinctCategoryNames, ['Fiction', 'Drama']);
});

test('parseWorkbook accepts long format when header is not on row 1', () => {
  const buffer = makeWorkbookBuffer([
    ['Category Remap Upload'],
    [],
    ['category_name', 'audiobook_id'],
    ['Fiction', 101],
  ]);

  const result = parseWorkbook(buffer);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].categoryName, 'Fiction');
  assert.equal(result.rows[0].audiobookId, 101);
});

test('parseWorkbook accepts wide format with title row and category columns', () => {
  const buffer = makeWorkbookBuffer([
    ['Books Category Wise Summary'],
    ['Fiction', 'Drama', 'History'],
    [101, 201, 301],
    [102, '', 302],
    ['', 203, 'abc'],
  ]);

  const result = parseWorkbook(buffer);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 6);
  assert.deepEqual(
    result.rows.map((row) => [row.categoryName, row.audiobookId]),
    [
      ['Fiction', 101],
      ['Drama', 201],
      ['History', 301],
      ['Fiction', 102],
      ['History', 302],
      ['Drama', 203],
    ]
  );
  assert.deepEqual(result.distinctCategoryNames, ['Fiction', 'Drama', 'History']);
  assert.equal(result.parseErrors.length, 1);
  assert.equal(result.parseErrors[0].reason, 'invalid audiobook_id');
  assert.equal(result.parseErrors[0].raw, 'abc');
});

test('parseWorkbook rejects unsupported layout', () => {
  const buffer = makeWorkbookBuffer([['Books Category Wise Summary']]);

  const result = parseWorkbook(buffer);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.message, /Unsupported sheet layout/);
  assert.deepEqual(result.headers, ['Books Category Wise Summary']);
});

test('parseWorkbook collects row parse errors instead of throwing', () => {
  const buffer = makeWorkbookBuffer([
    ['category_name', 'audiobook_id'],
    ['', 10],
    ['History', ''],
    ['History', 'abc'],
  ]);

  const result = parseWorkbook(buffer);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 0);
  assert.equal(result.parseErrors.length, 3);
  assert.equal(result.parseErrors[0].reason, 'empty category_name');
  assert.equal(result.parseErrors[1].reason, 'no id column / missing audiobook_id');
  assert.equal(result.parseErrors[2].reason, 'invalid audiobook_id');
});
