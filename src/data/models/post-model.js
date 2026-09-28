const DB = require('../db');
const { withTransaction } = require('../db-transaction-utils');
const LoggerError = require('../../utils/logger-error');
const { formatTimestamps } = require('../../utils/date-utils');
const {
  invalidatePostStats,
} = require('../../utils/post-stats-cache-utils');

class PostModel {
  tableName = 'posts';

  postTypeJoin = 'LEFT JOIN post_types pt ON pt.id = p.post_type_id';

  postTypeSelect = `
    p.is_spoiler,
    pt.id AS post_type_id, pt.name AS post_type_name, pt.slug AS post_type_slug
  `;

  mapPostRow = (row, options = {}) => {
    if (!row) return null;

    const post = formatTimestamps({
      id: row.id,
      user_id: row.user_id,
      title: row.post_type_slug === 'discussion' ? (row.title ?? null) : null,
      content: row.content,
      is_spoiler: row.is_spoiler === 1 || row.is_spoiler === true,
      like_count: row.like_count,
      comment_count: row.comment_count,
      share_count: row.share_count,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      post_type: row.post_type_id
        ? {
            id: row.post_type_id,
            name: row.post_type_name,
            slug: row.post_type_slug,
          }
        : null,
      author: {
        user_name: row.user_name,
        full_name: row.full_name,
        image_url: row.image_url,
      },
      audiobook: row.audiobook_id
        ? {
            id: row.audiobook_id,
            name: row.audiobook_name,
            thumb_path: row.audiobook_thumb_path,
            author_name: row.audiobook_author_name,
          }
        : null,
    });

    if (options.includeLikedByMe) {
      post.liked_by_me = row.liked_by_me === 1 || row.liked_by_me === true;
    }

    if (options.includeIsLikedByMe) {
      post.is_liked_by_me = row.liked_by_me === 1 || row.liked_by_me === true;
    }

    return post;
  };

  baseSelect = `
    SELECT p.id, p.user_id, p.audiobook_id, p.title, p.content,
      p.like_count, p.comment_count, p.share_count, p.status,
      p.created_at, p.updated_at,
      ${this.postTypeSelect},
      u.user_name, u.full_name, u.image_url,
      a.id AS audiobook_id, a.name AS audiobook_name,
      a.thumb_path AS audiobook_thumb_path, a.author_name AS audiobook_author_name
    FROM ${this.tableName} p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN audiobooks a ON a.id = p.audiobook_id
    ${this.postTypeJoin}
  `;

  create = async (userId, content, audiobookId, postTypeId, isSpoiler = false, title = null) => {
    try {
      if (audiobookId) {
        const bookCheck = await DB.query(
          'SELECT id FROM audiobooks WHERE id = ? AND deleted = 0 LIMIT 1',
          [audiobookId]
        );
        if (!bookCheck || bookCheck.length === 0) {
          return { error: 'Audiobook not found' };
        }
      }

      const sql = `
        INSERT INTO ${this.tableName} (user_id, audiobook_id, post_type_id, title, content, is_spoiler)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const result = await DB.query(sql, [
        userId,
        audiobookId || null,
        postTypeId,
        title || null,
        content || null,
        isSpoiler ? 1 : 0,
      ]);
      return { id: result.insertId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findById = async (id) => {
    try {
      const sql = `${this.baseSelect} WHERE p.id = ? AND p.deleted = 0 LIMIT 1`;
      const result = await DB.query(sql, [id]);
      if (!result || result.length === 0) return null;
      return this.mapPostRow(result[0]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  buildListQueryParts = (userId = null) => {
    let joinClause = '';
    let selectExtra = '0 AS liked_by_me';

    if (userId) {
      joinClause = `
        LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ?
      `;
      selectExtra = 'CASE WHEN pl.id IS NOT NULL THEN 1 ELSE 0 END AS liked_by_me';
    }

    const selectClause = `
      SELECT ${selectExtra}, p.id, p.user_id, p.audiobook_id, p.title, p.content,
        p.like_count, p.comment_count, p.share_count, p.status,
        p.created_at, p.updated_at,
        ${this.postTypeSelect},
        u.user_name, u.full_name, u.image_url,
        a.id AS audiobook_id, a.name AS audiobook_name,
        a.thumb_path AS audiobook_thumb_path, a.author_name AS audiobook_author_name
      FROM ${this.tableName} p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN audiobooks a ON a.id = p.audiobook_id
      ${this.postTypeJoin}
      ${joinClause}
    `;

    return {
      selectClause,
      params: userId ? [userId] : [],
    };
  };

  findAll = async (page, pageSize, userId = null, postTypeId = null, sort = 'recent') => {
    try {
      const offset = (page - 1) * pageSize;
      const { selectClause, params } = this.buildListQueryParts(userId);
      const typeFilterSql = postTypeId ? ' AND post_type_id = ?' : '';
      const typeFilterListSql = postTypeId ? ' AND p.post_type_id = ?' : '';
      const typeParams = postTypeId ? [postTypeId] : [];
      const orderClause = sort === 'trending'
        ? 'ORDER BY p.trending_score DESC, p.created_at DESC'
        : 'ORDER BY p.created_at DESC';
      const countSql = `SELECT COUNT(*) AS total FROM ${this.tableName} WHERE deleted = 0${typeFilterSql}`;
      const listSql = `
        ${selectClause}
        WHERE p.deleted = 0${typeFilterListSql}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, typeParams),
        DB.query(listSql, [...params, ...typeParams, pageSize, offset]),
      ]);

      const postIds = (listResult || []).map((row) => row.id);
      if (userId && postIds.length > 0) {
        const getLikesByMeSql = `SELECT post_id FROM post_likes WHERE post_id IN (${postIds
          .map(() => '?')
          .join(',')}) AND user_id = ?`;
        const getLikesByMeResult = await DB.query(getLikesByMeSql, [...postIds, userId]);
        const likedPostIdSet = new Set(getLikesByMeResult.map((like) => like.post_id));
        listResult.forEach((row) => {
          row.liked_by_me = likedPostIdSet.has(row.id);
        });
      } else {
        listResult.forEach((row) => {
          row.liked_by_me = false;
        });
      }



      return {
        data: (listResult || []).map((row) => this.mapPostRow(row, { includeLikedByMe: true })),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findByUserId = async (userId, page, pageSize, requestingUserId = null, postTypeId = null) => {
    try {
      const offset = (page - 1) * pageSize;
      const { selectClause, params } = this.buildListQueryParts(requestingUserId);
      const typeFilterSql = postTypeId ? ' AND post_type_id = ?' : '';
      const typeFilterListSql = postTypeId ? ' AND p.post_type_id = ?' : '';
      const typeParams = postTypeId ? [postTypeId] : [];
      const countSql = `SELECT COUNT(*) AS total FROM ${this.tableName} WHERE user_id = ? AND deleted = 0${typeFilterSql}`;
      const listSql = `
        ${selectClause}
        WHERE p.user_id = ? AND p.deleted = 0${typeFilterListSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [userId, ...typeParams]),
        DB.query(listSql, [...params, userId, ...typeParams, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => this.mapPostRow(row, { includeLikedByMe: true })),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  softDelete = async (postId) => {
    try {
      const sql = `UPDATE ${this.tableName} SET deleted = 1 WHERE id = ? AND deleted = 0`;
      const result = await DB.query(sql, [postId]);
      return result.affectedRows > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  updatePost = async (postId, { isSpoiler, title } = {}) => {
    try {
      const setClauses = [];
      const params = [];

      if (isSpoiler !== undefined) {
        setClauses.push('is_spoiler = ?');
        params.push(isSpoiler ? 1 : 0);
      }
      if (title !== undefined) {
        setClauses.push('title = ?');
        params.push(title);
      }
      if (setClauses.length === 0) {
        return false;
      }

      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(postId);

      const sql = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(', ')}
        WHERE id = ? AND deleted = 0
      `;
      const result = await DB.query(sql, params);
      return result.affectedRows > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getRawPost = async (postId) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted = 0 LIMIT 1`;
      const result = await DB.query(sql, [postId]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  isLikedByUser = async (postId, userId) => {
    if (!userId) return false;
    try {
      const sql = 'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1';
      const result = await DB.query(sql, [postId, userId]);
      return result && result.length > 0;
    } catch (e) {
      LoggerError.log(e);
      return false;
    }
  };

  likePost = async (postId, userId, likeType = 'like') => {
    try {
      const result = await withTransaction(async (query) => {
        const insertResult = await query(
          `INSERT INTO post_likes (post_id, user_id, like_type) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE like_type = VALUES(like_type)`,
          [postId, userId, likeType]
        );

        if (insertResult.affectedRows === 1) {
          await query(
            `UPDATE ${this.tableName} SET like_count = like_count + 1 WHERE id = ?`,
            [postId]
          );
        }

        const likeRow = await query(
          'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
          [postId, userId]
        );

        const postRow = await query(
          `SELECT like_count FROM ${this.tableName} WHERE id = ? LIMIT 1`,
          [postId]
        );

        return {
          liked: true,
          like_type: likeRow[0]?.like_type || likeType,
          like_count: postRow[0]?.like_count || 0,
        };
      });

      await invalidatePostStats(postId);
      return result;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  unlikePost = async (postId, userId) => {
    try {
      const result = await withTransaction(async (query) => {
        const deleteResult = await query(
          'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
          [postId, userId]
        );

        if (deleteResult.affectedRows > 0) {
          await query(
            `UPDATE ${this.tableName} SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?`,
            [postId]
          );
        }

        const postRow = await query(
          `SELECT like_count FROM ${this.tableName} WHERE id = ? LIMIT 1`,
          [postId]
        );

        return {
          liked: false,
          like_count: postRow[0]?.like_count || 0,
        };
      });

      await invalidatePostStats(postId);
      return result;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getLikes = async (postId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const countSql = 'SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?';
      const listSql = `
        SELECT pl.like_type, pl.created_at,
          u.user_name, u.full_name, u.image_url
        FROM post_likes pl
        JOIN users u ON u.id = pl.user_id
        WHERE pl.post_id = ?
        ORDER BY pl.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [postId]),
        DB.query(listSql, [postId, pageSize, offset]),
      ]);

      return {
        data: listResult || [],
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  addComment = async (postId, userId, comment, parentCommentId) => {
    try {
      if (parentCommentId) {
        const parentCheck = await DB.query(
          'SELECT id, post_id FROM post_comments WHERE id = ? AND deleted = 0 LIMIT 1',
          [parentCommentId]
        );
        if (!parentCheck || parentCheck.length === 0) {
          return { error: 'Parent comment not found' };
        }
        if (parentCheck[0].post_id !== Number(postId)) {
          return { error: 'Parent comment does not belong to this post' };
        }
      }

      const result = await withTransaction(async (query) => {
        const insertResult = await query(
          `INSERT INTO post_comments (post_id, user_id, parent_comment_id, comment)
           VALUES (?, ?, ?, ?)`,
          [postId, userId, parentCommentId || null, comment]
        );

        await query(
          `UPDATE ${this.tableName} SET comment_count = comment_count + 1 WHERE id = ?`,
          [postId]
        );

        const created = {
          id: insertResult.insertId,
          comment,
          user_id: userId,
          post_id: Number(postId),
        };
        if (parentCommentId) {
          created.parent_comment_id = Number(parentCommentId);
        }
        return created;
      });

      await invalidatePostStats(postId);
      return result;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getComments = async (postId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;

      const countSql = `
        SELECT COUNT(*) AS total FROM post_comments
        WHERE post_id = ? AND deleted = 0 AND parent_comment_id IS NULL
      `;

      const topLevelSql = `
        SELECT pc.id, pc.post_id, pc.user_id, pc.parent_comment_id, pc.comment,
          pc.like_count, pc.created_at, pc.updated_at,
          u.user_name, u.full_name, u.image_url
        FROM post_comments pc
        JOIN users u ON u.id = pc.user_id
        WHERE pc.post_id = ? AND pc.deleted = 0 AND pc.parent_comment_id IS NULL
        ORDER BY pc.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, topLevel] = await Promise.all([
        DB.query(countSql, [postId]),
        DB.query(topLevelSql, [postId, pageSize, offset]),
      ]);

      if (!topLevel || topLevel.length === 0) {
        return {
          data: [],
          total: countResult[0].total,
          page,
          pageSize,
        };
      }

      const topIds = topLevel.map((c) => c.id);
      const placeholders = topIds.map(() => '?').join(',');
      const repliesSql = `
        SELECT pc.id, pc.post_id, pc.user_id, pc.parent_comment_id, pc.comment,
          pc.like_count, pc.created_at, pc.updated_at,
          u.user_name, u.full_name, u.image_url
        FROM post_comments pc
        JOIN users u ON u.id = pc.user_id
        WHERE pc.post_id = ? AND pc.deleted = 0
          AND pc.parent_comment_id IN (${placeholders})
        ORDER BY pc.created_at ASC
      `;

      const replies = await DB.query(repliesSql, [postId, ...topIds]);

      const childMapper = {};
      (replies || []).forEach((item) => {
        const parentId = item.parent_comment_id;
        if (!childMapper[parentId]) {
          childMapper[parentId] = [];
        }
        childMapper[parentId].push(formatTimestamps({
          id: item.id,
          post_id: item.post_id,
          user_id: item.user_id,
          parent_comment_id: item.parent_comment_id,
          comment: item.comment,
          like_count: item.like_count,
          created_at: item.created_at,
          updated_at: item.updated_at,
          author: {
            user_name: item.user_name,
            full_name: item.full_name,
            image_url: item.image_url,
          },
        }));
      });

      const data = topLevel.map((item) => formatTimestamps({
        id: item.id,
        post_id: item.post_id,
        user_id: item.user_id,
        parent_comment_id: item.parent_comment_id,
        comment: item.comment,
        like_count: item.like_count,
        created_at: item.created_at,
        updated_at: item.updated_at,
        author: {
          user_name: item.user_name,
          full_name: item.full_name,
          image_url: item.image_url,
        },
        replies: childMapper[item.id] || [],
      }));

      return {
        data,
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getCommentById = async (commentId) => {
    try {
      const sql = 'SELECT * FROM post_comments WHERE id = ? LIMIT 1';
      const result = await DB.query(sql, [commentId]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  updateComment = async (commentId, comment) => {
    try {
      const sql = `
        UPDATE post_comments SET comment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted = 0
      `;
      const result = await DB.query(sql, [comment, commentId]);
      return result.affectedRows > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  softDeleteComment = async (commentId) => {
    try {
      const comment = await this.getCommentById(commentId);
      if (!comment || comment.deleted === 1) {
        return { deleted: false, postId: comment?.post_id };
      }

      await withTransaction(async (query) => {
        await query(
          'UPDATE post_comments SET deleted = 1 WHERE id = ? AND deleted = 0',
          [commentId]
        );
        await query(
          `UPDATE ${this.tableName} SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`,
          [comment.post_id]
        );
      });

      await invalidatePostStats(comment.post_id);
      return { deleted: true, postId: comment.post_id };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  recordShare = async (postId, userId, shareChannel) => {
    try {
      const result = await withTransaction(async (query) => {
        await query(
          'INSERT INTO post_shares (post_id, user_id, share_channel) VALUES (?, ?, ?)',
          [postId, userId, shareChannel || null]
        );

        await query(
          `UPDATE ${this.tableName} SET share_count = share_count + 1 WHERE id = ?`,
          [postId]
        );

        const postRow = await query(
          `SELECT share_count FROM ${this.tableName} WHERE id = ? LIMIT 1`,
          [postId]
        );

        return { share_count: postRow[0]?.share_count || 0 };
      });

      await invalidatePostStats(postId);
      return result;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getShareCount = async (postId) => {
    try {
      const sql = `SELECT share_count FROM ${this.tableName} WHERE id = ? AND deleted = 0 LIMIT 1`;
      const result = await DB.query(sql, [postId]);
      if (!result || result.length === 0) return null;
      return { share_count: result[0].share_count };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getStatsFromDb = async (postId) => {
    try {
      const sql = `SELECT like_count, comment_count, share_count FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await DB.query(sql, [postId]);
      if (!result || result.length === 0) return null;
      return {
        like_count: result[0].like_count,
        comment_count: result[0].comment_count,
        share_count: result[0].share_count,
      };
    } catch (e) {
      LoggerError.log(e);
      return null;
    }
  };
}

module.exports = new PostModel();
