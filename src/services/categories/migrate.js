const { withTransaction } = require('../../data/db-transaction-utils');
const { createCategoryBackupTables } = require('./backup');
const { normalizeName, CHUNK_SIZE } = require('./resolveCore');

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

class MigrationVerificationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'MigrationVerificationError';
    this.details = details;
  }
}

const assignCategoryIds = (resolved) => {
  const categoryIdByKey = new Map();
  for (const category of resolved.categoriesToReuse) {
    categoryIdByKey.set(normalizeName(category.name), category.id);
  }
  return categoryIdByKey;
};

const buildFinalLinks = (resolved, categoryIdByKey) => {
  const links = [];
  const seen = new Set();

  for (const link of resolved.newLinks) {
    const categoryId = categoryIdByKey.get(link.categoryKey);
    if (!categoryId) {
      continue;
    }
    const pairKey = `${categoryId}:${link.audiobookId}`;
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    links.push({
      category_id: categoryId,
      audiobook_id: link.audiobookId,
    });
  }

  return links;
};

const runMigrationTransaction = async (resolved, { force }) => {
  return withTransaction(async (query) => {
    const [oldLinkRows, oldCategoryRows] = await Promise.all([
      query('SELECT id, audiobook_id FROM categories_audiobooks'),
      query('SELECT id, name FROM categories WHERE deleted = 0'),
    ]);

    const oldLinkIds = oldLinkRows.map((row) => row.id);
    const oldAudiobookIds = new Set(oldLinkRows.map((row) => row.audiobook_id));

    const categoryIdByKey = assignCategoryIds(resolved);

    for (const category of resolved.categoriesToCreate) {
      const insertResult = await query(
        'INSERT INTO categories (name, deleted) VALUES (?, 0)',
        [category.name]
      );
      categoryIdByKey.set(normalizeName(category.name), insertResult.insertId);
    }

    if (resolved.categoriesToUndelete.length > 0) {
      const undeleteIds = [...new Set(resolved.categoriesToUndelete)];
      for (const chunk of chunkArray(undeleteIds, CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(', ');
        await query(
          `UPDATE categories SET deleted = 0, updated_at = NOW() WHERE id IN (${placeholders})`,
          chunk
        );
      }
    }

    const finalLinks = buildFinalLinks(resolved, categoryIdByKey);

    for (const chunk of chunkArray(finalLinks, CHUNK_SIZE)) {
      const values = chunk.map((link) => [link.category_id, link.audiobook_id]);
      await query(
        'INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES ?',
        [values]
      );
    }

    if (oldLinkIds.length > 0) {
      for (const chunk of chunkArray(oldLinkIds, CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(', ');
        await query(
          `DELETE FROM categories_audiobooks WHERE id IN (${placeholders})`,
          chunk
        );
      }
    }

    const keepCategoryIds = new Set(categoryIdByKey.values());
    const oldCategoryIdsToRetire = oldCategoryRows
      .filter((row) => !keepCategoryIds.has(row.id))
      .map((row) => row.id);

    if (oldCategoryIdsToRetire.length > 0) {
      for (const chunk of chunkArray(oldCategoryIdsToRetire, CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(', ');
        await query(
          `UPDATE categories SET deleted = 1, updated_at = NOW() WHERE id IN (${placeholders})`,
          chunk
        );
      }
    }

    const [activeCategoryCountRow] = await query(
      'SELECT COUNT(*) AS count FROM categories WHERE deleted = 0'
    );
    const [pivotCountRow] = await query(
      'SELECT COUNT(*) AS count FROM categories_audiobooks'
    );

    const activeCategoryCount = Number(activeCategoryCountRow.count);
    const pivotCount = Number(pivotCountRow.count);
    const expectedCategoryCount = resolved.distinctCategoryNames.length;
    const expectedPivotCount = finalLinks.length;

    if (activeCategoryCount !== expectedCategoryCount) {
      throw new MigrationVerificationError('Active category count mismatch after migration', {
        expectedCategoryCount,
        activeCategoryCount,
      });
    }

    if (pivotCount !== expectedPivotCount) {
      throw new MigrationVerificationError('Category-audiobook link count mismatch after migration', {
        expectedPivotCount,
        pivotCount,
      });
    }

    const newAudiobookIds = new Set(finalLinks.map((link) => link.audiobook_id));
    const orphanedAudiobookIds = [...oldAudiobookIds].filter(
      (audiobookId) => !newAudiobookIds.has(audiobookId)
    );

    if (!force && orphanedAudiobookIds.length > 0) {
      throw new MigrationVerificationError(
        'Some audiobooks that previously had categories would be orphaned',
        { orphanedAudiobookIds }
      );
    }

    return {
      finalLinks,
      oldCategoryIdsToRetire,
      oldLinkIdsDeleted: oldLinkIds.length,
    };
  });
};

/**
 * @param {object} resolved
 * @param {{ dryRun: boolean, force: boolean }} options
 */
const migrateCategoryRemap = async (resolved, options) => {
  const { dryRun, force } = options;
  const createdNames = resolved.categoriesToCreate.map((category) => category.name);
  const reusedNames = resolved.categoriesToReuse.map((category) => category.name);
  const allNames = [...new Set([...createdNames, ...reusedNames])];

  const baseResponse = {
    dryRun,
    newCategories: {
      created: createdNames.length,
      reused: reusedNames.length,
      names: allNames,
    },
    newLinks: {
      toInsert: resolved.newLinks.length,
    },
    unmatchedAudiobooks: resolved.unmatchedAudiobooks,
    resolveErrors: resolved.resolveErrors,
    committed: false,
  };

  if (dryRun) {
    return baseResponse;
  }

  const ts = Date.now();
  const backupTables = await createCategoryBackupTables(ts);
  const migrationResult = await runMigrationTransaction(resolved, { force });

  return {
    ...baseResponse,
    committed: true,
    backupTables,
    migrationResult,
  };
};

module.exports = {
  migrateCategoryRemap,
  MigrationVerificationError,
  buildFinalLinks,
  assignCategoryIds,
};
