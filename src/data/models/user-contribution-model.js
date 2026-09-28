const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const PostModel = require('./post-model');

class UserContributionModel {
  findMyPosts = async (userId, page, pageSize, postTypeId = null) => {
    try {
      return await PostModel.findByUserId(userId, page, pageSize, userId, postTypeId);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findLikedPosts = async (userId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const countSql = `
        SELECT COUNT(*) AS total
        FROM post_likes pl
        JOIN posts p ON p.id = pl.post_id
        WHERE pl.user_id = ? AND p.deleted = 0
      `;
      const listSql = `
        SELECT p.id, p.user_id, p.audiobook_id, p.title, p.content,
          p.like_count, p.comment_count, p.share_count, p.status,
          p.created_at, p.updated_at,
          ${PostModel.postTypeSelect},
          u.user_name, u.full_name, u.image_url,
          a.id AS audiobook_id, a.name AS audiobook_name,
          a.thumb_path AS audiobook_thumb_path, a.author_name AS audiobook_author_name,
          1 AS liked_by_me
        FROM post_likes pl
        JOIN posts p ON p.id = pl.post_id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN audiobooks a ON a.id = p.audiobook_id
        ${PostModel.postTypeJoin}
        WHERE pl.user_id = ? AND p.deleted = 0
        ORDER BY pl.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [userId]),
        DB.query(listSql, [userId, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) =>
          PostModel.mapPostRow(row, { includeLikedByMe: true })
        ),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findCommentedPosts = async (userId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const countSql = `
        SELECT COUNT(DISTINCT p.id) AS total
        FROM post_comments pc
        JOIN posts p ON p.id = pc.post_id
        WHERE pc.user_id = ? AND pc.deleted = 0 AND p.deleted = 0
      `;
      const listSql = `
        SELECT p.id, p.user_id, p.audiobook_id, p.title, p.content,
          p.like_count, p.comment_count, p.share_count, p.status,
          p.created_at, p.updated_at,
          ${PostModel.postTypeSelect},
          u.user_name, u.full_name, u.image_url,
          a.id AS audiobook_id, a.name AS audiobook_name,
          a.thumb_path AS audiobook_thumb_path, a.author_name AS audiobook_author_name,
          MAX(pc.created_at) AS last_commented_at
        FROM post_comments pc
        JOIN posts p ON p.id = pc.post_id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN audiobooks a ON a.id = p.audiobook_id
        ${PostModel.postTypeJoin}
        WHERE pc.user_id = ? AND pc.deleted = 0 AND p.deleted = 0
        GROUP BY p.id
        ORDER BY last_commented_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [userId]),
        DB.query(listSql, [userId, pageSize, offset]),
      ]);

      const postIds = (listResult || []).map((row) => row.id);
      if (postIds.length > 0) {
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
        data: (listResult || []).map((row) =>
          PostModel.mapPostRow(row, { includeLikedByMe: true })
        ),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };
}

module.exports = new UserContributionModel();
