const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class DiscoveryModel {
  getListeningStats = async (userId) => {
    const hoursSql = `
      SELECT COALESCE(SUM(total_listen_time), 0) / 3600.0 AS total_listened_hours
      FROM continueBookStatus
      WHERE user_id = ?
    `;

    const completedSql = `
      SELECT COUNT(*) AS total_books_completed
      FROM continueBookStatus
      WHERE user_id = ? AND finished = 1
    `;

    const lastMonthSql = `
      SELECT COUNT(*) AS last_month_completed_books
      FROM continueBookStatus
      WHERE user_id = ?
        AND finished = 1
        AND finished_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')
        AND finished_at < DATE_FORMAT(CURDATE(), '%Y-%m-01 00:00:00')
    `;

    const currentlyListeningSql = `
      SELECT
        cbs.book_id,
        cbs.current_episode,
        cbs.current_timer,
        cbs.total_duration,
        ROUND(LEAST(100, (cbs.total_listen_time / NULLIF(cbs.total_duration, 0)) * 100)) AS progress_percent,
        ab.name AS book_name,
        ab.thumb_path AS book_cover
      FROM continueBookStatus AS cbs
      LEFT JOIN audiobooks AS ab ON ab.id = cbs.book_id
      WHERE cbs.user_id = ? AND cbs.finished = 0
      ORDER BY cbs.updated_at DESC
    `;

    try {
      const [hoursResult, completedResult, lastMonthResult, currentlyListening] =
        await Promise.all([
          DB.query(hoursSql, [userId]),
          DB.query(completedSql, [userId]),
          DB.query(lastMonthSql, [userId]),
          DB.query(currentlyListeningSql, [userId]),
        ]);

      return {
        total_listened_hours: Number(hoursResult[0]?.total_listened_hours || 0),
        total_books_completed: Number(completedResult[0]?.total_books_completed || 0),
        last_month_completed_books: Number(
          lastMonthResult[0]?.last_month_completed_books || 0
        ),
        currently_listening: (currentlyListening || []).map((row) => ({
          book_id: row.book_id,
          current_episode: row.current_episode,
          current_timer: row.current_timer,
          total_duration: row.total_duration,
          progress_percent: Number(row.progress_percent || 0),
          book_name: row.book_name,
          book_cover: row.book_cover,
        })),
      };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  getTopContributors = async (monthStart, monthEnd) => {
    const sql = `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.image_url,
        COALESCE(SUM(cbs.total_listen_time), 0) / 3600.0 AS total_listen_hours_this_month,
        (
          SELECT COUNT(*)
          FROM continueBookStatus cbs2
          WHERE cbs2.user_id = u.id AND cbs2.finished = 1
        ) AS total_books_completed
      FROM continueBookStatus AS cbs
      INNER JOIN users AS u ON u.id = cbs.user_id
      WHERE u.is_subscribed = 1
        AND u.deleted = 0
        AND cbs.updated_at >= ?
        AND cbs.updated_at < ?
      GROUP BY u.id, u.full_name, u.image_url
      ORDER BY SUM(cbs.total_listen_time) DESC
      LIMIT 3
    `;

    try {
      const rows = await DB.query(sql, [monthStart, monthEnd]);
      return (rows || []).map((row) => ({
        user_id: row.user_id,
        full_name: row.full_name,
        image_url: row.image_url,
        total_listen_hours_this_month: Number(row.total_listen_hours_this_month || 0),
        total_books_completed: Number(row.total_books_completed || 0),
      }));
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  getTopAuthors = async (limit) => {
    const sql = `
      SELECT
        a.id AS author_id,
        a.name,
        a.en_name,
        a.imageUrl,
        COUNT(ab.id) AS total_books,
        COALESCE(SUM(ab.play_count), 0) AS total_play_count
      FROM authors AS a
      INNER JOIN audiobooks AS ab
        ON ab.author_name = a.name
        AND ab.deleted = 0
        AND ab.approval_status = 1
      WHERE a.isActive = 1
        AND a.deleted = 0
      GROUP BY a.id, a.name, a.en_name, a.imageUrl
      HAVING total_books > 0
      ORDER BY total_play_count DESC, total_books DESC
      LIMIT ?
    `;

    try {
      const rows = await DB.query(sql, [limit]);
      return (rows || []).map((row) => ({
        author_id: row.author_id,
        name: row.name,
        en_name: row.en_name,
        imageUrl: row.imageUrl,
        total_books: Number(row.total_books || 0),
        total_play_count: Number(row.total_play_count || 0),
      }));
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  getPopularCategories = async (limit) => {
    const sql = `
      SELECT
        c.id AS category_id,
        c.name,
        c.thumb_path,
        COUNT(DISTINCT cbs.user_id) AS total_listeners
      FROM categories AS c
      INNER JOIN categories_audiobooks AS ca ON ca.category_id = c.id
      INNER JOIN continueBookStatus AS cbs ON cbs.book_id = ca.audiobook_id
      WHERE c.deleted = 0
      GROUP BY c.id, c.name, c.thumb_path
      ORDER BY total_listeners DESC
      LIMIT ?
    `;

    try {
      const rows = await DB.query(sql, [limit]);
      return (rows || []).map((row) => ({
        category_id: row.category_id,
        name: row.name,
        thumb_path: row.thumb_path,
        total_listeners: Number(row.total_listeners || 0),
      }));
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };
}

module.exports = new DiscoveryModel();
