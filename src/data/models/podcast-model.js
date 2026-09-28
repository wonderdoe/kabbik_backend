const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const { withTransaction } = require('../db-transaction-utils');
const { dedupeTagsBySlug } = require('../../utils/podcast-tag-utils');
const { formatTimestamps } = require('../../utils/date-utils');
const {
  REACTION_LIKE,
  REACTION_DISLIKE,
  computeReactionTransition,
  applyPremiumAccess,
} = require('../../utils/podcast-reaction-utils');
const {
  incrementReactionDeltas,
  attachLiveCounts,
} = require('../../utils/podcast-count-cache-utils');

const LIST_FIELDS = `p.id, p.title, p.description, p.is_premium,
  p.podcast_url, p.thumb_url, p.like_count, p.dislike_count, p.comment_count, p.view_count`;

const DETAIL_FIELDS = 'p.created_at, p.updated_at';

class PodcastModel {
  mapPodcastRow = (row) => {
    const mapped = {
      id: row.id,
      title: row.title,
      description: row.description,
      is_premium: Number(row.is_premium) || 0,
      podcast_url: row.podcast_url,
      thumb_url: row.thumb_url,
      like_count: Number(row.like_count) || 0,
      dislike_count: Number(row.dislike_count) || 0,
      comment_count: Number(row.comment_count) || 0,
      view_count: Number(row.view_count) || 0,
      user_reaction: row.user_reaction ?? null,
      ...(row.shared_tag_count !== undefined
        ? { shared_tag_count: Number(row.shared_tag_count) || 0 }
        : {}),
    };

    if (row.created_at !== undefined) {
      mapped.created_at = row.created_at;
      mapped.updated_at = row.updated_at;
      return formatTimestamps(mapped);
    }

    return mapped;
  };

  applyPremiumAccess = applyPremiumAccess;

  normalizePremiumFlag = (value) => {
    if (value === undefined || value === null) {
      return 0;
    }
    return value === true || value === 1 || value === '1' ? 1 : 0;
  };

  linkTags = async (query, podcastId, tagNames) => {
    const tags = dedupeTagsBySlug(tagNames);

    for (const { name, slug } of tags) {
      const insertResult = await query(
        `INSERT INTO tag (name, slug) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [name, slug]
      );

      const tagId = insertResult.insertId;
      await query(
        'INSERT IGNORE INTO podcast_tag (podcast_id, tag_id) VALUES (?, ?)',
        [podcastId, tagId]
      );
    }
  };

  createPodcast = async ({ title, description, is_premium, podcast_url, thumb_url, tags }) => {
    try {
      const podcastId = await withTransaction(async (query) => {
        const insertResult = await query(
          `INSERT INTO podcast (title, description, is_premium, podcast_url, thumb_url)
           VALUES (?, ?, ?, ?, ?)`,
          [
            title,
            description ?? null,
            this.normalizePremiumFlag(is_premium),
            podcast_url,
            thumb_url,
          ]
        );

        const newId = insertResult.insertId;
        await this.linkTags(query, newId, tags);
        return newId;
      });

      return this.findById(podcastId, null);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  updatePodcast = async (id, fields, { tagsProvided }) => {
    try {
      await withTransaction(async (query) => {
        const updates = [];
        const values = [];

        if (Object.prototype.hasOwnProperty.call(fields, 'title')) {
          updates.push('title = ?');
          values.push(fields.title);
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'description')) {
          updates.push('description = ?');
          values.push(fields.description ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'is_premium')) {
          updates.push('is_premium = ?');
          values.push(this.normalizePremiumFlag(fields.is_premium));
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'podcast_url')) {
          updates.push('podcast_url = ?');
          values.push(fields.podcast_url);
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'thumb_url')) {
          updates.push('thumb_url = ?');
          values.push(fields.thumb_url);
        }

        if (updates.length > 0) {
          await query(
            `UPDATE podcast SET ${updates.join(', ')} WHERE id = ?`,
            [...values, id]
          );
        }

        if (tagsProvided) {
          await query('DELETE FROM podcast_tag WHERE podcast_id = ?', [id]);
          await this.linkTags(query, id, fields.tags);
        }
      });

      return this.findById(id, null);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  deletePodcast = async (id) => {
    try {
      await withTransaction(async (query) => {
        await query('DELETE FROM podcast WHERE id = ?', [id]);
      });
      return true;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  buildReactionJoin = (userId) => {
    if (!userId) {
      return {
        joinClause: '',
        reactionSelect: 'NULL AS user_reaction',
        reactionParams: [],
      };
    }

    return {
      joinClause: `
        LEFT JOIN podcast_reaction pr
          ON pr.podcast_id = p.id AND pr.user_id = ?
      `,
      reactionSelect: 'pr.reaction_type AS user_reaction',
      reactionParams: [userId],
    };
  };

  search = async ({ q, page, limit, userId }) => {
    try {
      const offset = (page - 1) * limit;
      const { joinClause, reactionSelect, reactionParams } = this.buildReactionJoin(userId);
      const matchClause = 'MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE)';

      const countSql = `
        SELECT COUNT(*) AS total
        FROM podcast p
        WHERE ${matchClause}
      `;

      const listSql = `
        SELECT
          ${LIST_FIELDS},
          ${reactionSelect},
          MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE) AS relevance
        FROM podcast p
        ${joinClause}
        WHERE ${matchClause}
        ORDER BY relevance DESC, p.id DESC
        LIMIT ? OFFSET ?
      `;

      const countParams = [q];
      const listParams = [q, ...reactionParams, q, limit, offset];

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, countParams),
        DB.query(listSql, listParams),
      ]);

      return {
        rows: (listResult || []).map((row) => this.mapPodcastRow(row)),
        total: countResult[0]?.total ?? 0,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findAll = async ({ page, limit, tagSlug, userId, sort = 'recent' }) => {
    try {
      const offset = (page - 1) * limit;
      const { joinClause, reactionSelect, reactionParams } = this.buildReactionJoin(userId);

      const filterParams = [];

      let tagJoin = '';
      if (tagSlug) {
        tagJoin = `
          INNER JOIN podcast_tag pt ON pt.podcast_id = p.id
          INNER JOIN tag t ON t.id = pt.tag_id AND t.slug = ?
        `;
        filterParams.push(tagSlug);
      }

      const countFromClause = `
        FROM podcast p
        ${tagJoin}
      `;

      const listFromClause = `
        FROM podcast p
        ${tagJoin}
        ${joinClause}
      `;

      const orderClause = sort === 'trending'
        ? 'ORDER BY p.trending_score DESC, p.id DESC'
        : 'ORDER BY p.id DESC';
      const listFields = sort === 'trending'
        ? `${LIST_FIELDS}, p.trending_score`
        : LIST_FIELDS;

      const countSql = `SELECT COUNT(DISTINCT p.id) AS total ${countFromClause}`;
      const listSql = `
        SELECT DISTINCT
          ${listFields},
          ${reactionSelect}
        ${listFromClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const countParams = [...filterParams];
      const listParams = [...filterParams, ...reactionParams, limit, offset];

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, countParams),
        DB.query(listSql, listParams),
      ]);

      return {
        rows: (listResult || []).map((row) => this.mapPodcastRow(row)),
        total: countResult[0]?.total ?? 0,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  incrementViewCount = async (id) => {
    try {
      await DB.query(
        'UPDATE podcast SET view_count = view_count + 1 WHERE id = ?',
        [id]
      );
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  existsById = async (podcastId) => {
    try {
      const result = await DB.query(
        'SELECT id FROM podcast WHERE id = ? LIMIT 1',
        [podcastId]
      );
      return result && result.length > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findById = async (id, userId) => {
    try {
      const { joinClause, reactionSelect, reactionParams } = this.buildReactionJoin(userId);

      const sql = `
        SELECT
          ${LIST_FIELDS},
          ${DETAIL_FIELDS},
          ${reactionSelect}
        FROM podcast p
        ${joinClause}
        WHERE p.id = ?
        LIMIT 1
      `;

      const result = await DB.query(sql, [...reactionParams, id]);
      if (!result || result.length === 0) {
        return null;
      }

      const tagsSql = `
        SELECT t.id, t.name, t.slug
        FROM podcast_tag pt
        JOIN tag t ON t.id = pt.tag_id
        WHERE pt.podcast_id = ?
        ORDER BY t.name ASC
      `;
      const tags = await DB.query(tagsSql, [id]);

      return {
        podcast: this.mapPodcastRow(result[0]),
        tags: tags || [],
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findSimilar = async (sourceId, { page, limit, userId }) => {
    try {
      const offset = (page - 1) * limit;
      const { joinClause, reactionSelect, reactionParams } = this.buildReactionJoin(userId);

      const baseFrom = `
        FROM podcast_tag pt1
        JOIN podcast_tag pt2
          ON pt1.tag_id = pt2.tag_id AND pt2.podcast_id != pt1.podcast_id
        JOIN podcast p ON p.id = pt2.podcast_id
        ${joinClause}
        WHERE pt1.podcast_id = ?
      `;

      const countSql = `
        SELECT COUNT(*) AS total FROM (
          SELECT p.id
          ${baseFrom}
          GROUP BY p.id
        ) t
      `;

      const listSql = `
        SELECT
          ${LIST_FIELDS},
          ${reactionSelect},
          COUNT(DISTINCT pt2.tag_id) AS shared_tag_count
        ${baseFrom}
        GROUP BY p.id, p.title, p.description, p.is_premium,
          p.podcast_url, p.thumb_url, p.like_count, p.dislike_count, p.comment_count, p.view_count
          ${userId ? ', pr.reaction_type' : ''}
        ORDER BY shared_tag_count DESC, p.id DESC
        LIMIT ? OFFSET ?
      `;

      const baseParams = [...reactionParams, sourceId];
      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, baseParams),
        DB.query(listSql, [...baseParams, limit, offset]),
      ]);

      return {
        rows: (listResult || []).map((row) => this.mapPodcastRow(row)),
        total: countResult[0]?.total ?? 0,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  toggleReaction = async (podcastId, userId, targetType) => {
    try {
      return await withTransaction(async (query) => {
        const podcastRows = await query(
          'SELECT id FROM podcast WHERE id = ? LIMIT 1',
          [podcastId]
        );

        if (!podcastRows || podcastRows.length === 0) {
          return { notFound: true };
        }

        let reactionRows;
        try {
          reactionRows = await query(
            `SELECT reaction_type FROM podcast_reaction
             WHERE user_id = ? AND podcast_id = ?
             FOR UPDATE`,
            [userId, podcastId]
          );
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            reactionRows = await query(
              `SELECT reaction_type FROM podcast_reaction
               WHERE user_id = ? AND podcast_id = ?
               FOR UPDATE`,
              [userId, podcastId]
            );
          } else {
            throw err;
          }
        }

        const existing = reactionRows?.[0]?.reaction_type ?? null;
        const transition = computeReactionTransition(existing, targetType);

        if (transition.action === 'insert') {
          try {
            await query(
              `INSERT INTO podcast_reaction (podcast_id, user_id, reaction_type)
               VALUES (?, ?, ?)`,
              [podcastId, userId, targetType]
            );
            await this.applyTransition(query, podcastId, userId, targetType, transition);
          } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') {
              throw err;
            }
            const current = await query(
              `SELECT reaction_type FROM podcast_reaction
               WHERE user_id = ? AND podcast_id = ?
               FOR UPDATE`,
              [userId, podcastId]
            );
            const retryTransition = computeReactionTransition(
              current?.[0]?.reaction_type ?? null,
              targetType
            );
            await this.applyTransition(query, podcastId, userId, targetType, retryTransition);
          }
        } else {
          await this.applyTransition(query, podcastId, userId, targetType, transition);
        }

        const podcastRow = await query(
          'SELECT like_count, dislike_count, view_count FROM podcast WHERE id = ? LIMIT 1',
          [podcastId]
        );

        const finalReaction = await query(
          `SELECT reaction_type FROM podcast_reaction
           WHERE user_id = ? AND podcast_id = ?
           LIMIT 1`,
          [userId, podcastId]
        );

        const [mergedCounts] = await attachLiveCounts([{
          id: podcastId,
          like_count: Number(podcastRow[0]?.like_count) || 0,
          dislike_count: Number(podcastRow[0]?.dislike_count) || 0,
          view_count: Number(podcastRow[0]?.view_count) || 0,
        }]);

        return {
          like_count: mergedCounts.like_count,
          dislike_count: mergedCounts.dislike_count,
          user_reaction: finalReaction?.[0]?.reaction_type ?? null,
        };
      });
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  applyTransition = async (query, podcastId, userId, targetType, transition) => {
    if (transition.action === 'delete') {
      await query(
        'DELETE FROM podcast_reaction WHERE user_id = ? AND podcast_id = ?',
        [userId, podcastId]
      );
    } else if (transition.action === 'update') {
      await query(
        `UPDATE podcast_reaction SET reaction_type = ?
         WHERE user_id = ? AND podcast_id = ?`,
        [targetType, userId, podcastId]
      );
    }

    await incrementReactionDeltas(
      podcastId,
      transition.likeDelta,
      transition.dislikeDelta
    );
  };
}

module.exports = new PodcastModel();
module.exports.computeReactionTransition = computeReactionTransition;
module.exports.REACTION_LIKE = REACTION_LIKE;
module.exports.REACTION_DISLIKE = REACTION_DISLIKE;
module.exports.applyPremiumAccess = applyPremiumAccess;
