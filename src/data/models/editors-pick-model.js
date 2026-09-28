const DB = require('../db');
const { withTransaction } = require('../db-transaction-utils');
const LoggerError = require('../../utils/logger-error');

class EditorsPickModel {
  tableName = 'editors_picks';

  baseSelect = `
    SELECT
      ep.id, ep.audiobook_id, ep.editor_id, ep.cap_title, ep.caption,
      ep.banner, ep.position, ep.start_date, ep.end_date, ep.is_active,
      ep.created_at, ep.updated_at,
      a.id AS ab_id,
      a.name AS ab_name,
      a.author_name AS ab_author_name,
      a.thumb_path AS ab_thumb_path,
      a.total_duration AS ab_total_duration,
      a.play_count AS ab_play_count,
      a.price AS ab_price,
      a.discount_price AS ab_discount_price,
      (SELECT IFNULL(AVG(r.rating), 5)
       FROM ratings AS r
       WHERE r.audiobook_id = a.id) AS ab_rating
    FROM ${this.tableName} ep
    INNER JOIN audiobooks a ON a.id = ep.audiobook_id
  `;

  mapRow = (row, includeAdminFields = false) => {
    if (!row) return null;

    const pick = {
      id: row.id,
      cap_title: row.cap_title,
      caption: row.caption,
      banner: row.banner,
      position: row.position,
      audiobook: {
        id: row.ab_id,
        name: row.ab_name,
        author_name: row.ab_author_name,
        thumb_path: row.ab_thumb_path,
        total_duration: row.ab_total_duration,
        play_count: row.ab_play_count,
        price: row.ab_price,
        discount_price: row.ab_discount_price,
        rating: row.ab_rating != null ? Number(row.ab_rating) : 5,
      },
    };

    if (includeAdminFields) {
      pick.audiobook_id = row.audiobook_id;
      pick.editor_id = row.editor_id;
      pick.is_active = row.is_active;
      pick.start_date = row.start_date;
      pick.end_date = row.end_date;
      pick.created_at = row.created_at;
      pick.updated_at = row.updated_at;
    }

    return pick;
  };

  activeWhereClause = `
    ep.deleted = 0
    AND ep.is_active = 1
    AND (ep.start_date IS NULL OR ep.start_date <= NOW())
    AND (ep.end_date IS NULL OR ep.end_date >= NOW())
    AND a.deleted = 0
    AND a.approval_status = 1
  `;

  adminWhereClause = 'ep.deleted = 0';

  audiobookExists = async (audiobookId) => {
    const result = await DB.query(
      'SELECT id FROM audiobooks WHERE id = ? AND deleted = 0 LIMIT 1',
      [audiobookId]
    );
    return result && result.length > 0;
  };

  create = async (editorId, data) => {
    try {
      const exists = await this.audiobookExists(data.audiobook_id);
      if (!exists) {
        return { error: 'Audiobook not found' };
      }

      const sql = `
        INSERT INTO ${this.tableName}
          (audiobook_id, editor_id, cap_title, caption, banner, position, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await DB.query(sql, [
        data.audiobook_id,
        editorId,
        data.cap_title || null,
        data.caption || null,
        data.banner || null,
        data.position != null ? data.position : 0,
        data.start_date || null,
        data.end_date || null,
      ]);

      return { id: result.insertId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findActiveAll = async (page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const where = this.activeWhereClause;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} ep
        INNER JOIN audiobooks a ON a.id = ep.audiobook_id
        WHERE ${where}
      `;
      const listSql = `
        ${this.baseSelect}
        WHERE ${where}
        ORDER BY ep.position ASC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql),
        DB.query(listSql, [pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => this.mapRow(row)),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findActiveById = async (pickId) => {
    try {
      const sql = `
        ${this.baseSelect}
        WHERE ep.id = ? AND ${this.activeWhereClause}
        LIMIT 1
      `;
      const result = await DB.query(sql, [pickId]);
      if (!result || result.length === 0) return null;
      return this.mapRow(result[0]);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findAllAdmin = async (page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;
      const where = this.adminWhereClause;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} ep
        INNER JOIN audiobooks a ON a.id = ep.audiobook_id
        WHERE ${where}
      `;
      const listSql = `
        ${this.baseSelect}
        WHERE ${where}
        ORDER BY ep.position ASC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql),
        DB.query(listSql, [pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => this.mapRow(row, true)),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findByIdAdmin = async (pickId) => {
    try {
      const sql = `
        ${this.baseSelect}
        WHERE ep.id = ? AND ${this.adminWhereClause}
        LIMIT 1
      `;
      const result = await DB.query(sql, [pickId]);
      if (!result || result.length === 0) return null;
      return this.mapRow(result[0], true);
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  update = async (pickId, data) => {
    try {
      const existing = await DB.query(
        `SELECT id FROM ${this.tableName} WHERE id = ? AND deleted = 0 LIMIT 1`,
        [pickId]
      );
      if (!existing || existing.length === 0) {
        return { error: 'Editor pick not found' };
      }

      const fields = [];
      const values = [];
      const allowed = [
        'cap_title', 'caption', 'banner', 'position',
        'start_date', 'end_date', 'is_active',
      ];

      for (const key of allowed) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }

      if (fields.length === 0) {
        return { id: pickId };
      }

      values.push(pickId);
      const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`;
      await DB.query(sql, values);

      return { id: pickId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  softDelete = async (pickId) => {
    try {
      const sql = `UPDATE ${this.tableName} SET deleted = 1 WHERE id = ? AND deleted = 0`;
      const result = await DB.query(sql, [pickId]);
      return result.affectedRows > 0;
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  reorder = async (items) => {
    try {
      return await withTransaction(async (query) => {
        for (const { id, position } of items) {
          await query(
            `UPDATE ${this.tableName} SET position = ? WHERE id = ? AND deleted = 0`,
            [position, id]
          );
        }
        return { reordered: items.length };
      });
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };
}

module.exports = new EditorsPickModel();
