const normalizeName = (name) => String(name ?? '').trim().toLowerCase();

const extractCategoriesArray = (body) => {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && Array.isArray(body.categories)) {
    return body.categories;
  }
  return null;
};

/**
 * @param {unknown} body
 * @returns {{
 *   ok: true,
 *   rows: Array<{ categoryName: string, audiobookId: number, rowNumber: number }>,
 *   parseErrors: Array<{ row: number, raw: string, reason: string }>,
 *   distinctCategoryNames: string[],
 * } | { ok: false, status: number, message: string }}
 */
const parseCategoryJson = (body) => {
  const categories = extractCategoriesArray(body);
  if (!categories) {
    return {
      ok: false,
      status: 400,
      message:
        'Invalid JSON body. Expected an array of categories or { categories: [...] }.',
    };
  }

  const rows = [];
  const parseErrors = [];
  const categoryNameByKey = new Map();

  categories.forEach((item, index) => {
    const rowNumber = index + 1;
    const rawCategoryName = String(item?.category_name ?? '').trim();

    if (!rawCategoryName) {
      parseErrors.push({
        row: rowNumber,
        raw: JSON.stringify(item ?? null),
        reason: 'empty category_name',
      });
      return;
    }

    const categoryKey = normalizeName(rawCategoryName);
    if (!categoryNameByKey.has(categoryKey)) {
      categoryNameByKey.set(categoryKey, rawCategoryName);
    }
    const categoryName = categoryNameByKey.get(categoryKey);

    const audiobookIds = item?.audiobook_ids;
    if (!Array.isArray(audiobookIds)) {
      parseErrors.push({
        row: rowNumber,
        raw: rawCategoryName,
        reason: 'audiobook_ids must be an array',
      });
      return;
    }

    const seenIds = new Set();
    audiobookIds.forEach((rawId) => {
      const idString = String(rawId ?? '').trim();
      if (!idString) {
        parseErrors.push({
          row: rowNumber,
          raw: rawCategoryName,
          reason: 'missing audiobook_id',
        });
        return;
      }

      const audiobookId = Number(idString);
      if (!Number.isInteger(audiobookId) || audiobookId <= 0) {
        parseErrors.push({
          row: rowNumber,
          raw: idString,
          reason: 'invalid audiobook_id',
        });
        return;
      }

      if (seenIds.has(audiobookId)) {
        return;
      }
      seenIds.add(audiobookId);

      rows.push({
        categoryName,
        audiobookId,
        rowNumber,
      });
    });
  });

  return {
    ok: true,
    rows,
    parseErrors,
    distinctCategoryNames: [...categoryNameByKey.values()],
  };
};

module.exports = {
  parseCategoryJson,
};
