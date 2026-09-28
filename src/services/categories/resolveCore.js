const CHUNK_SIZE = 500;

const normalizeName = (name) => String(name ?? '').trim().toLowerCase();

/**
 * Pure resolution against in-memory DB snapshots (for tests and dry-run planning).
 * @param {Array<{ categoryName: string, audiobookId: number, rowNumber: number }>} parsedRows
 * @param {{ categories: Array<{ id: number, name: string, deleted: number }>, validAudiobookIds: Set<number> }} context
 */
const resolveFromData = (parsedRows, context) => {
  const { categories, validAudiobookIds } = context;
  const categoriesByKey = new Map();

  for (const category of categories) {
    const key = normalizeName(category.name);
    if (!categoriesByKey.has(key)) {
      categoriesByKey.set(key, []);
    }
    categoriesByKey.get(key).push(category);
  }

  const resolveErrors = [];
  const categoriesToCreate = [];
  const categoriesToReuse = [];
  const categoriesToUndelete = [];
  const categoryKeyToMeta = new Map();
  const unmatchedAudiobooks = [];
  const linkKeys = new Set();
  const newLinks = [];

  const distinctCategoryNames = [...new Set(parsedRows.map((row) => row.categoryName))];
  for (const categoryName of distinctCategoryNames) {
    const key = normalizeName(categoryName);
    const matches = categoriesByKey.get(key) || [];

    if (matches.length > 1) {
      resolveErrors.push({
        categoryName,
        reason: 'ambiguous category name in database',
        matches: matches.map((m) => m.id),
      });
      continue;
    }

    if (matches.length === 1) {
      const match = matches[0];
      categoriesToReuse.push({ id: match.id, name: categoryName });
      if (Number(match.deleted) === 1) {
        categoriesToUndelete.push(match.id);
      }
      categoryKeyToMeta.set(key, { categoryId: match.id, categoryName });
      continue;
    }

    categoriesToCreate.push({ name: categoryName });
    categoryKeyToMeta.set(key, { categoryName, pendingCreate: true });
  }

  const blockedCategoryKeys = new Set(
    resolveErrors.map((error) => normalizeName(error.categoryName))
  );

  for (const row of parsedRows) {
    const key = normalizeName(row.categoryName);
    if (blockedCategoryKeys.has(key)) {
      continue;
    }

    const meta = categoryKeyToMeta.get(key);
    if (!meta) {
      continue;
    }

    if (!validAudiobookIds.has(row.audiobookId)) {
      unmatchedAudiobooks.push({
        row: row.rowNumber,
        raw: String(row.audiobookId),
        reason: 'audiobook id not found or deleted',
      });
      continue;
    }

    const categoryId = meta.categoryId ?? null;
    const linkKey = `${categoryId ?? `new:${key}`}:${row.audiobookId}`;
    if (linkKeys.has(linkKey)) {
      continue;
    }
    linkKeys.add(linkKey);

    newLinks.push({
      categoryKey: key,
      categoryName: row.categoryName,
      categoryId,
      audiobookId: row.audiobookId,
      rowNumber: row.rowNumber,
    });
  }

  return {
    categoriesToCreate,
    categoriesToReuse,
    categoriesToUndelete,
    newLinks,
    unmatchedAudiobooks,
    resolveErrors,
    distinctCategoryNames,
  };
};

module.exports = {
  resolveFromData,
  normalizeName,
  CHUNK_SIZE,
};
