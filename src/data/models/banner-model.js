const DB = require('../db');

class BannerModel {
  tableName = 'promotion_banners';

  mapRow = (row) => {
    if (!row) return null;

    if (row.payload != null && typeof row.payload === 'string') {
      try {
        row.payload = JSON.parse(row.payload);
      } catch {
        // keep raw string if parse fails
      }
    }

    return row;
  };

  serializePayload = (payload) => {
    if (payload === undefined || payload === null) {
      return null;
    }
    if (typeof payload === 'string') {
      return payload;
    }
    return JSON.stringify(payload);
  };

  findAll = async (isActive) => {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
    `;
    const values = [];

    if (isActive !== undefined && isActive !== null) {
      sql += ' AND is_active = ?';
      values.push(isActive);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await DB.query(sql, values);
    return rows.map((row) => this.mapRow(row));
  };

  findById = async (id) => {
    const rows = await DB.query(
      `SELECT * FROM ${this.tableName}
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows && rows.length > 0 ? this.mapRow(rows[0]) : null;
  };

  create = async ({ banner_url, goto_page, is_active, payload, target_audience }) => {
    const result = await DB.query(
      `INSERT INTO ${this.tableName} (banner_url, goto_page, is_active, payload, target_audience)
       VALUES (?, ?, ?, ?, ?)`,
      [
        banner_url,
        goto_page,
        is_active,
        this.serializePayload(payload),
        target_audience ?? null,
      ]
    );
    return this.findById(result.insertId);
  };

  update = async (id, fields) => {
    const allowed = ['banner_url', 'goto_page', 'is_active', 'payload', 'target_audience'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(
          key === 'payload' ? this.serializePayload(fields[key]) : fields[key]
        );
      }
    }

    if (setClauses.length === 0) {
      return { affectedRows: 0, row: null };
    }

    values.push(id);

    const result = await DB.query(
      `UPDATE ${this.tableName}
       SET ${setClauses.join(', ')}
       WHERE id = ?
         AND deleted_at IS NULL`,
      values
    );

    const row = result.affectedRows > 0 ? await this.findById(id) : null;
    return { affectedRows: result.affectedRows, row };
  };

  toggle = async (id) => {
    const result = await DB.query(
      `UPDATE ${this.tableName}
       SET is_active = NOT is_active
       WHERE id = ?
         AND deleted_at IS NULL`,
      [id]
    );

    const row = result.affectedRows > 0 ? await this.findById(id) : null;
    return { affectedRows: result.affectedRows, row };
  };

  softDelete = async (id) => {
    const result = await DB.query(
      `UPDATE ${this.tableName}
       SET deleted_at = NOW()
       WHERE id = ?
         AND deleted_at IS NULL`,
      [id]
    );
    return result.affectedRows;
  };
}

module.exports = new BannerModel();
