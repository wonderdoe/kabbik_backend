const DB = require('../../data/db');

/**
 * Creates timestamped backup tables outside the mutation transaction.
 * MySQL DDL implicitly commits, so these cannot live inside withTransaction.
 * @param {number} ts
 * @returns {Promise<{ categories: string, categoriesAudiobooks: string }>}
 */
const createCategoryBackupTables = async (ts) => {
  const categoriesTable = `categories_backup_${ts}`;
  const categoriesAudiobooksTable = `categories_audiobooks_backup_${ts}`;

  await DB.query(`CREATE TABLE ${categoriesTable} AS SELECT * FROM categories`);
  await DB.query(
    `CREATE TABLE ${categoriesAudiobooksTable} AS SELECT * FROM categories_audiobooks`
  );

  return {
    categories: categoriesTable,
    categoriesAudiobooks: categoriesAudiobooksTable,
  };
};

module.exports = {
  createCategoryBackupTables,
};
