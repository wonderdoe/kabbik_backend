const DB = require('../db');

class QuickAccessModel {
  tableName = 'quick_access';

  listActiveForAudience = async (audience) => {
    const sql = `
      SELECT id, en_name, bn_name, goto_page
      FROM ${this.tableName}
      WHERE is_active = 1
        AND audience IN ('all', ?)
      ORDER BY sort_order ASC, id ASC
    `;
    return DB.query(sql, [audience]);
  };
}

module.exports = new QuickAccessModel();
