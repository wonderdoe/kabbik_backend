const DB = require('../../data/db');
const {
  resolveFromData,
  normalizeName,
  CHUNK_SIZE,
} = require('./resolveCore');

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const loadValidAudiobookIds = async (audiobookIds) => {
  const uniqueIds = [...new Set(audiobookIds)];
  if (!uniqueIds.length) {
    return new Set();
  }

  const validIds = new Set();
  for (const chunk of chunkArray(uniqueIds, CHUNK_SIZE)) {
    const placeholders = chunk.map(() => '?').join(', ');
    const rows = await DB.query(
      `SELECT id FROM audiobooks WHERE id IN (${placeholders}) AND deleted = 0`,
      chunk
    );
    for (const row of rows) {
      validIds.add(row.id);
    }
  }
  return validIds;
};

const resolveCategoryLinks = async (parsedRows) => {
  const categories = await DB.query('SELECT id, name, deleted FROM categories');
  const audiobookIds = parsedRows.map((row) => row.audiobookId);
  const validAudiobookIds = await loadValidAudiobookIds(audiobookIds);

  return resolveFromData(parsedRows, { categories, validAudiobookIds });
};

const getOldDataCounts = async () => {
  const [linkCountRow] = await DB.query(
    'SELECT COUNT(*) AS count FROM categories_audiobooks'
  );
  const [categoryCountRow] = await DB.query(
    'SELECT COUNT(*) AS count FROM categories WHERE deleted = 0'
  );

  return {
    categoryAudiobookRows: Number(linkCountRow.count),
    categories: Number(categoryCountRow.count),
  };
};

module.exports = {
  resolveFromData,
  resolveCategoryLinks,
  getOldDataCounts,
  normalizeName,
  CHUNK_SIZE,
};
