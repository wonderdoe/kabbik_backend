const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

const CARD_FIELDS = `a.id, a.name, a.en_name, a.author_name, a.en_author_name,
  a.description, a.thumb_path, a.banner_path, a.price, a.discount_price,
  a.price_in_usd, a.publish_year, a.rent_duration_in_month, a.rent_duration_in_day,
  a.total_duration, a.category_id, a.channel_id, a.premium, a.play_count, a.created_at`;

const ELIGIBLE_WHERE = `for_rent = 1 AND deleted = 0 AND approval_status = 1`;

class RentModel {
  getTrending = async (months, limit, offset) => {
    try {
      const sql = `
        SELECT ${CARD_FIELDS}, t.rent_count
        FROM (
          SELECT audiobook_id, COUNT(*) AS rent_count
          FROM audiobooks_rent
          WHERE payment_id IS NOT NULL
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            AND audiobook_id IN (
              SELECT id FROM audiobooks
              WHERE ${ELIGIBLE_WHERE}
            )
          GROUP BY audiobook_id
          ORDER BY rent_count DESC, audiobook_id DESC
          LIMIT ? OFFSET ?
        ) t
        INNER JOIN audiobooks a ON a.id = t.audiobook_id
        ORDER BY t.rent_count DESC, a.id DESC`;

      return await DB.query(sql, [months, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getTrendingCount = async (months) => {
    try {
      const sql = `
        SELECT COUNT(DISTINCT audiobook_id) AS total
        FROM audiobooks_rent
        WHERE payment_id IS NOT NULL
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
          AND audiobook_id IN (
            SELECT id FROM audiobooks
            WHERE ${ELIGIBLE_WHERE}
          )`;

      const result = await DB.query(sql, [months]);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getNewReleases = async (months, limit, offset) => {
    try {
      const sql = `
        SELECT ${CARD_FIELDS}
        FROM audiobooks a
        WHERE a.for_rent = 1 AND a.deleted = 0 AND a.approval_status = 1
          AND a.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?`;

      return await DB.query(sql, [months, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getNewReleasesCount = async (months) => {
    try {
      const sql = `
        SELECT COUNT(*) AS total
        FROM audiobooks a
        WHERE a.for_rent = 1 AND a.deleted = 0 AND a.approval_status = 1
          AND a.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)`;

      const result = await DB.query(sql, [months]);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getAllRentals = async (filters, limit, offset) => {
    try {
      const { conditions, params } = this.buildAllRentalsFilters(filters);
      const whereClause = conditions.join(' AND ');

      const sql = `
        SELECT ${CARD_FIELDS}
        FROM audiobooks a
        WHERE ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?`;

      return await DB.query(sql, [...params, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getAllRentalsCount = async (filters) => {
    try {
      const { conditions, params } = this.buildAllRentalsFilters(filters);
      const whereClause = conditions.join(' AND ');

      const sql = `
        SELECT COUNT(*) AS total
        FROM audiobooks a
        WHERE ${whereClause}`;

      const result = await DB.query(sql, params);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  buildAllRentalsFilters = (filters = {}) => {
    const conditions = [
      'a.for_rent = 1',
      'a.deleted = 0',
      'a.approval_status = 1',
    ];
    const params = [];

    if (filters.category_id != null) {
      conditions.push(`EXISTS (
        SELECT 1 FROM categories_audiobooks ca
        WHERE ca.audiobook_id = a.id AND ca.category_id = ?
      )`);
      params.push(filters.category_id);
    }

    if (filters.channel_id != null) {
      conditions.push('a.channel_id = ?');
      params.push(filters.channel_id);
    }

    return { conditions, params };
  };

  searchRentAudiobooks = async (booleanQuery, limit, offset) => {
    try {
      const sql = `
        SELECT ${CARD_FIELDS},
          MATCH(a.name, a.author_name, a.en_name) AGAINST (? IN BOOLEAN MODE) AS relevance
        FROM audiobooks a
        WHERE a.for_rent = 1 AND a.deleted = 0 AND a.approval_status = 1
          AND MATCH(a.name, a.author_name, a.en_name) AGAINST (? IN BOOLEAN MODE)
        ORDER BY relevance DESC
        LIMIT ? OFFSET ?`;

      return await DB.query(sql, [booleanQuery, booleanQuery, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  searchRentAudiobooksCount = async (booleanQuery) => {
    try {
      const sql = `
        SELECT COUNT(*) AS total
        FROM audiobooks a
        WHERE a.for_rent = 1 AND a.deleted = 0 AND a.approval_status = 1
          AND MATCH(a.name, a.author_name, a.en_name) AGAINST (? IN BOOLEAN MODE)`;

      const result = await DB.query(sql, [booleanQuery]);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getUserActiveRents = async (userId, limit, offset) => {
    try {
      const sql = `
        SELECT
          ar.id AS rent_id, ar.audiobook_id, ar.created_at AS rented_at,
          ar.expired_at, ar.is_purchased,
          a.name, a.en_name, a.author_name, a.en_author_name,
          a.thumb_path, a.banner_path, a.rent_duration_in_day, a.rent_duration_in_month
        FROM audiobooks_rent ar
        INNER JOIN audiobooks a ON a.id = ar.audiobook_id
        WHERE ar.user_id = ? AND ar.is_purchased = 1 AND ar.expired_at > NOW()
        ORDER BY ar.expired_at ASC
        LIMIT ? OFFSET ?`;

      return await DB.query(sql, [userId, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getUserActiveRentsCount = async (userId) => {
    try {
      const sql = `
        SELECT COUNT(*) AS total
        FROM audiobooks_rent ar
        WHERE ar.user_id = ? AND ar.is_purchased = 1 AND ar.expired_at > NOW()`;

      const result = await DB.query(sql, [userId]);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getUserExpiredRents = async (userId, limit, offset) => {
    try {
      const sql = `
        SELECT
          ar.id AS rent_id, ar.audiobook_id, ar.created_at AS rented_at,
          ar.expired_at, ar.is_purchased,
          a.name, a.en_name, a.author_name, a.en_author_name,
          a.thumb_path, a.banner_path, a.rent_duration_in_day, a.rent_duration_in_month
        FROM audiobooks_rent ar
        INNER JOIN audiobooks a ON a.id = ar.audiobook_id
        WHERE ar.user_id = ? AND ar.is_purchased = 1 AND ar.expired_at <= NOW()
        ORDER BY ar.expired_at DESC
        LIMIT ? OFFSET ?`;

      return await DB.query(sql, [userId, limit, offset]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  getUserExpiredRentsCount = async (userId) => {
    try {
      const sql = `
        SELECT COUNT(*) AS total
        FROM audiobooks_rent ar
        WHERE ar.user_id = ? AND ar.is_purchased = 1 AND ar.expired_at <= NOW()`;

      const result = await DB.query(sql, [userId]);
      return result[0]?.total ?? 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };
}

module.exports = new RentModel();
