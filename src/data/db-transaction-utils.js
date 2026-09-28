require('dotenv').config();
const mysql = require('mysql2');

/**
 * Transaction helper using a dedicated pool (db.js does not expose getConnection).
 * Consider merging getConnection() into db.js long-term to avoid a second pool.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4',
  timezone: 'Z',
  connectionLimit: 10,
  acquireTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
  jsonStrings: true,
});

const queryOnConnection = (connection, sql, values) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });

const withTransaction = async (callback) => {
  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  const queryFn = (sql, values) => queryOnConnection(connection, sql, values);

  try {
    await queryOnConnection(connection, 'START TRANSACTION');
    const result = await callback(queryFn);
    await queryOnConnection(connection, 'COMMIT');
    return result;
  } catch (err) {
    try {
      await queryOnConnection(connection, 'ROLLBACK');
    } catch (rollbackErr) {
      console.error('Transaction rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = { withTransaction };
