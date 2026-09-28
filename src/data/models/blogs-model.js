const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const { formatTimestamps } = require('../../utils/date-utils');

class BlogsModel {
  REACTION_LIKE = 1;
  REACTION_DISLIKE = 2;

  isBlogVisible = async (blogId) => {
    try {
      const sql = `
        SELECT id FROM blogs
        WHERE id = ? AND deleted = 0 AND approved = 1
        LIMIT 1
      `;
      const result = await DB.query(sql, [blogId]);
      return result && result.length > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  mapBlogListRow = (row) => {
    const reactionType = row.like_type ?? null;

    return formatTimestamps({
      ...row,
      like_count: Number(row.like_count) || 0,
      comment_count: Number(row.comment_count) || 0,
      dislike_count: Number(row.dislike_count) || 0,
      liked_by_me: reactionType === this.REACTION_LIKE,
      like_type: reactionType,
    });
  };

  buildListFilters = (req) => {
    const conditions = ['b.deleted = 0'];
    const params = [];

    if (req.query.type === 'pending') {
      conditions.push('b.approved = 0');
    } else if (req.query.type === 'approved') {
      conditions.push('b.approved = 1');
    }

    if (req.query.userId) {
      conditions.push('b.user_id = ?');
      params.push(Number(req.query.userId));
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  };

  findAll = async (req, userId = null) => {
    try {
      const { whereClause, params } = this.buildListFilters(req);
      const listParams = [...params];
      let joinClause = '';
      let reactionSelect = 'NULL AS like_type';

      if (userId) {
        joinClause = `
          LEFT JOIN blog_reactions br ON br.blog_id = b.id AND br.user_id = ?
        `;
        reactionSelect = 'br.reaction_type AS like_type';
        listParams.unshift(userId);
      }

      let limitClause = '';
      if (req.query.offset || req.query.limit) {
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;
        limitClause = 'LIMIT ? OFFSET ?';
        listParams.push(limit, offset);
      }

      const countSql = `
        SELECT COUNT(*) AS count
        FROM blogs b
        WHERE ${whereClause}
      `;
      const listSql = `
        SELECT
          b.*,
          COALESCE(bs.likeCount, 0) AS like_count,
          COALESCE(bs.dislikeCount, 0) AS dislike_count,
          COALESCE(bs.commentCount, 0) AS comment_count,
          ${reactionSelect}
        FROM blogs b
        LEFT JOIN blog_stats bs ON bs.blog_id = b.id
        ${joinClause}
        WHERE ${whereClause}
        ORDER BY b.created_at DESC
        ${limitClause}
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, params),
        DB.query(listSql, listParams),
      ]);

      return {
        list: (listResult || []).map((row) => this.mapBlogListRow(row)),
        count: countResult[0].count,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getStats = async (blogId) => {
    try {
      const sql = `
        SELECT likeCount, dislikeCount, commentCount
        FROM blog_stats
        WHERE blog_id = ?
        LIMIT 1
      `;
      const result = await DB.query(sql, [blogId]);
      if (!result || result.length === 0) {
        return {
          likeCount: 0,
          dislikeCount: 0,
          commentCount: 0,
        };
      }
      return result[0];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findByIdWithStats = async (blogId) => {
    try {
      const sql = `
        SELECT
          b.*,
          COALESCE(bs.likeCount, 0)    AS likeCount,
          COALESCE(bs.dislikeCount, 0) AS dislikeCount,
          COALESCE(bs.commentCount, 0) AS commentCount
        FROM blogs b
        LEFT JOIN blog_stats bs ON bs.blog_id = b.id
        WHERE b.id = ? AND b.deleted = 0 AND b.approved = 1
        LIMIT 1
      `;
      const result = await DB.query(sql, [blogId]);
      if (!result || result.length === 0) return null;
      return formatTimestamps(result[0]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getUserReaction = async (blogId, userId) => {
    try {
      if (!userId) return null;
      const sql = `
        SELECT reaction_type FROM blog_reactions
        WHERE blog_id = ? AND user_id = ?
        LIMIT 1
      `;
      const result = await DB.query(sql, [blogId, userId]);
      if (!result || result.length === 0) return null;
      return result[0].reaction_type;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  upsertReaction = async (blogId, userId, reactionType) => {
    try {
      await DB.query(
        `INSERT INTO blog_reactions (blog_id, user_id, reaction_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type)`,
        [blogId, userId, reactionType]
      );

      const stats = await this.getStats(blogId);
      return {
        reaction_type: reactionType,
        likeCount: stats.likeCount,
        dislikeCount: stats.dislikeCount,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  removeReaction = async (blogId, userId) => {
    try {
      await DB.query(
        'DELETE FROM blog_reactions WHERE blog_id = ? AND user_id = ?',
        [blogId, userId]
      );

      const stats = await this.getStats(blogId);
      return {
        reaction_type: null,
        likeCount: stats.likeCount,
        dislikeCount: stats.dislikeCount,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getReactions = async (blogId, page, pageSize, typeFilter) => {
    try {
      const offset = (page - 1) * pageSize;
      const params = [blogId];
      let typeClause = '';

      if (typeFilter === 'like') {
        typeClause = ' AND br.reaction_type = ?';
        params.push(this.REACTION_LIKE);
      } else if (typeFilter === 'dislike') {
        typeClause = ' AND br.reaction_type = ?';
        params.push(this.REACTION_DISLIKE);
      }

      const countSql = `
        SELECT COUNT(*) AS total FROM blog_reactions br
        WHERE br.blog_id = ?${typeClause}
      `;
      const listSql = `
        SELECT br.reaction_type, br.created_at,
          u.user_name, u.full_name, u.image_url
        FROM blog_reactions br
        JOIN users u ON u.id = br.user_id
        WHERE br.blog_id = ?${typeClause}
        ORDER BY br.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, params),
        DB.query(listSql, [...params, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => formatTimestamps(row)),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  addComment = async (blogId, userId, comment) => {
    try {
      const result = await DB.query(
        'INSERT INTO blog_comments (comment, userId, blogId) VALUES (?, ?, ?)',
        [comment, userId, blogId]
      );

      return {
        id: result.insertId,
        comment,
        userId,
        blogId,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getComments = async (blogId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const countSql = `
        SELECT COUNT(*) AS total FROM blog_comments
        WHERE blogId = ? AND deleted = 0
      `;
      const listSql = `
        SELECT bc.id, bc.comment, bc.userId, bc.blogId,
          bc.created_at, bc.updated_at,
          u.user_name, u.full_name, u.image_url
        FROM blog_comments bc
        JOIN users u ON u.id = bc.userId
        WHERE bc.blogId = ? AND bc.deleted = 0
        ORDER BY bc.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [blogId]),
        DB.query(listSql, [blogId, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => formatTimestamps(row)),
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
      const sql = 'SELECT * FROM blog_comments WHERE id = ? LIMIT 1';
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
        UPDATE blog_comments SET comment = ?, updated_at = CURRENT_TIMESTAMP
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
      const sql = `
        UPDATE blog_comments SET deleted = 1
        WHERE id = ? AND deleted = 0
      `;
      const result = await DB.query(sql, [commentId]);
      return result.affectedRows > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

 
}

module.exports = new BlogsModel();
