const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class PostTypeModel {
  tableName = 'post_types';

  findActiveList = async () => {
    try {
      const sql = `
        SELECT id, name, slug
        FROM ${this.tableName}
        WHERE is_active = 1
        ORDER BY sort_order ASC
      `;
      const result = await DB.query(sql);
      return result || [];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findActiveById = async (id) => {
    try {
      const sql = `
        SELECT id, name, slug
        FROM ${this.tableName}
        WHERE id = ? AND is_active = 1
        LIMIT 1
      `;
      const result = await DB.query(sql, [id]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findActiveBySlug = async (slug) => {
    try {
      const sql = `
        SELECT id, name, slug
        FROM ${this.tableName}
        WHERE slug = ? AND is_active = 1
        LIMIT 1
      `;
      const result = await DB.query(sql, [slug]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };
}

module.exports = new PostTypeModel();
