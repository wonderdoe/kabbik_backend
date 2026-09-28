const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const GlobalTask = require("../../utils/global-tasker");

class CategoryModel {
  tableName = "categories";

  getAll = async (req) => {


  const sql = `SELECT 
    ca.*, 
    (
        CASE 
            WHEN (pc.category_id = ca.id AND pc.expired_at > NOW())
            THEN 1 
            ELSE 0 
        END
    ) AS isPurchased
FROM 
    ${this.tableName} AS ca
LEFT JOIN 
    purchased_category AS pc 
    ON pc.category_id = ca.id AND pc.user_id = ${req.currentUser.id}
WHERE 
    ca.forAcademic = 0
ORDER BY 
    ca.priority`;


    GlobalTask.insertLogsOptional({
      USERID: req.currentUser ? req.currentUser.id : "",
      userAction: "CategoryList",
      endpoint: "/v1/category",
      forTask: "Category",
      source: req.query.source,
      platform: req.query.platform,
      user_ip: req.user_ip,
    }).catch((error) => {
      console.error("Error:", error);
    });
    try {
      const results = await DB.query(sql, [this.tableName]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };
  getAllCategoriesAdmin = async () => {
    const sql = `Select * from  ${this.tableName} order by priority`;
    try {
      const results = await DB.query(sql, [this.tableName]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };
  getAllApp = async () => {
    const sql = `Select * from  ${this.tableName} Where forAcademic =0  order by priority`;
    try {
      const results = await DB.query(sql, [this.tableName]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };
  getAllAppSuggestion = async () => {
    const sql = `Select * from  ${this.tableName} Where forAcademic =0 Order by RAND() LIMIT 6`;
    try {
      const results = await DB.query(sql, [this.tableName]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findById = async (id) => {
    const sql = "CALL get_entity_by_id(?, ?)";
    try {
      const results = await DB.query(sql, [id, this.tableName]);
      if (results) {
        // sp returns extra data, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  create = async (category_name, imageUrl) => {
    let sql = null;
    try {
      if (imageUrl) {
        sql = `INSERT INTO categories (name, thumb_path, deleted) VALUES (?, ?, ?);`;
        const results = await DB.query(sql, [category_name, imageUrl, 0]);
        if (results) {
          return results;
        }
      } else {
        sql = `INSERT INTO categories (name, deleted) VALUES (?, ?);`;
        const results = await DB.query(sql, [category_name, 0]);
        if (results) {
          return results;
        }
      }
    } catch (error) {
      LoggerError.log(error);
      return undefined;
    }
  };

  update = async (id, category_name, imageUrl) => {
    let sql = null;
    try {
      if (imageUrl) {
        sql = `UPDATE categories SET name=?, thumb_path=? WHERE id=?`;
        const results = await DB.query(sql, [category_name, imageUrl, id]);
        if (results) {
          return results;
        }
      } else {
        sql = `UPDATE categories SET name=? WHERE id=?`;
        const results = await DB.query(sql, [category_name, id]);
        if (results) {
          return results;
        }
      }
    } catch (error) {
      LoggerError.log(error);
      return undefined;
    }
  };

  delete = async (id) => {
    const sql = "CALL delete_entity_soft(?, ?)";
    try {
      const results = await DB.query(sql, [id, this.tableName]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };
}

module.exports = new CategoryModel();
