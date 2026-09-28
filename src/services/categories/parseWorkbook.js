const xlsx = require('xlsx');

const REQUIRED_HEADERS = ['category_name', 'audiobook_id'];
const OPTIONAL_HEADERS = ['audiobook_name'];
const LONG_FORMAT_SCAN_ROWS = 15;
const WIDE_MIN_NON_EMPTY_CELLS = 2;

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase();

const isRowEmpty = (row) =>
  row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');

const countNonEmptyCells = (row) =>
  (row || []).filter((cell) => String(cell ?? '').trim() !== '').length;

const findLongFormatHeaderIndex = (rawRows) => {
  const scanLimit = Math.min(rawRows.length, LONG_FORMAT_SCAN_ROWS);
  for (let i = 0; i < scanLimit; i += 1) {
    const normalizedHeaders = (rawRows[i] || []).map(normalizeHeader);
    const hasRequired = REQUIRED_HEADERS.every((header) =>
      normalizedHeaders.includes(header)
    );
    if (hasRequired) {
      return i;
    }
  }
  return -1;
};

const findWideHeaderIndex = (rawRows) => {
  for (let i = 0; i < rawRows.length; i += 1) {
    if (countNonEmptyCells(rawRows[i]) >= WIDE_MIN_NON_EMPTY_CELLS) {
      return i;
    }
  }
  return -1;
};

const buildUnsupportedLayoutError = (rawRows) => {
  const headerRow = (rawRows[0] || []).map((cell) => String(cell ?? '').trim());
  const headers = headerRow.filter((header) => header !== '');
  return {
    ok: false,
    status: 400,
    message: `Unsupported sheet layout. Required columns: ${REQUIRED_HEADERS.join(', ')} (long format), or category names as column headers with audiobook IDs below (wide format). Found: ${headers.join(', ') || '(none)'}`,
    headers,
  };
};

const parseLongFormat = (rawRows, headerIndex) => {
  const headerRow = rawRows[headerIndex].map((cell) => String(cell ?? '').trim());
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const categoryNameIdx = normalizedHeaders.indexOf('category_name');
  const audiobookIdIdx = normalizedHeaders.indexOf('audiobook_id');
  const audiobookNameIdx = normalizedHeaders.indexOf('audiobook_name');

  const rows = [];
  const parseErrors = [];
  const categoryNameByKey = new Map();

  for (let i = headerIndex + 1; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    if (!row || isRowEmpty(row)) {
      continue;
    }

    const rowNumber = i + 1;
    const rawCategory = String(row[categoryNameIdx] ?? '').trim();
    const rawAudiobookId = row[audiobookIdIdx];
    const rawAudiobookName =
      audiobookNameIdx >= 0 ? String(row[audiobookNameIdx] ?? '').trim() : '';

    if (!rawCategory) {
      parseErrors.push({
        row: rowNumber,
        raw: JSON.stringify(row),
        reason: 'empty category_name',
      });
      continue;
    }

    const categoryKey = rawCategory.toLowerCase();
    if (!categoryNameByKey.has(categoryKey)) {
      categoryNameByKey.set(categoryKey, rawCategory);
    }
    const categoryName = categoryNameByKey.get(categoryKey);

    const idString = String(rawAudiobookId ?? '').trim();
    if (!idString) {
      parseErrors.push({
        row: rowNumber,
        raw: rawAudiobookName || rawCategory,
        reason: 'no id column / missing audiobook_id',
      });
      continue;
    }

    const audiobookId = Number(idString);
    if (!Number.isInteger(audiobookId) || audiobookId <= 0) {
      parseErrors.push({
        row: rowNumber,
        raw: idString,
        reason: 'invalid audiobook_id',
      });
      continue;
    }

    rows.push({
      categoryName,
      audiobookId,
      audiobookNameRaw: rawAudiobookName || undefined,
      rowNumber,
    });
  }

  return {
    ok: true,
    rows,
    parseErrors,
    distinctCategoryNames: [...categoryNameByKey.values()],
  };
};

const parseWideFormat = (rawRows, headerIndex) => {
  const headerRow = rawRows[headerIndex].map((cell) => String(cell ?? '').trim());
  const categoryNameByKey = new Map();
  const categoryColumns = [];

  for (let col = 0; col < headerRow.length; col += 1) {
    const rawCategory = headerRow[col];
    if (!rawCategory) {
      continue;
    }

    const categoryKey = rawCategory.toLowerCase();
    if (!categoryNameByKey.has(categoryKey)) {
      categoryNameByKey.set(categoryKey, rawCategory);
    }

    categoryColumns.push({
      col,
      categoryName: categoryNameByKey.get(categoryKey),
    });
  }

  if (categoryColumns.length === 0) {
    const headers = headerRow.filter((header) => header !== '');
    return {
      ok: false,
      status: 400,
      message: `Unsupported sheet layout. Wide format requires category names in the header row. Found: ${headers.join(', ') || '(none)'}`,
      headers,
    };
  }

  const rows = [];
  const parseErrors = [];

  for (let i = headerIndex + 1; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    if (!row || isRowEmpty(row)) {
      continue;
    }

    const rowNumber = i + 1;
    for (const { col, categoryName } of categoryColumns) {
      const idString = String(row[col] ?? '').trim();
      if (!idString) {
        continue;
      }

      const audiobookId = Number(idString);
      if (!Number.isInteger(audiobookId) || audiobookId <= 0) {
        parseErrors.push({
          row: rowNumber,
          raw: idString,
          reason: 'invalid audiobook_id',
        });
        continue;
      }

      rows.push({
        categoryName,
        audiobookId,
        rowNumber,
      });
    }
  }

  return {
    ok: true,
    rows,
    parseErrors,
    distinctCategoryNames: [...categoryNameByKey.values()],
  };
};

/**
 * @param {Buffer} buffer
 * @returns {{
 *   ok: true,
 *   rows: Array<{ categoryName: string, audiobookId?: number, audiobookNameRaw?: string, rowNumber: number }>,
 *   parseErrors: Array<{ row: number, raw: string, reason: string }>,
 *   distinctCategoryNames: string[],
 * } | { ok: false, status: number, message: string, headers: string[] }}
 */
const parseWorkbook = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      ok: false,
      status: 400,
      message: 'Workbook has no sheets',
      headers: [],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows.length) {
    return {
      ok: false,
      status: 400,
      message: 'Sheet is empty',
      headers: [],
    };
  }

  const longHeaderIndex = findLongFormatHeaderIndex(rawRows);
  if (longHeaderIndex >= 0) {
    return parseLongFormat(rawRows, longHeaderIndex);
  }

  const wideHeaderIndex = findWideHeaderIndex(rawRows);
  if (wideHeaderIndex < 0) {
    return buildUnsupportedLayoutError(rawRows);
  }

  const wideResult = parseWideFormat(rawRows, wideHeaderIndex);
  if (!wideResult.ok) {
    return wideResult;
  }

  return wideResult;
};

module.exports = {
  parseWorkbook,
  REQUIRED_HEADERS,
  OPTIONAL_HEADERS,
};
