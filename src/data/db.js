require('dotenv').config();
const mysql = require('mysql2');

class DB {
    constructor() {
        this.db = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_DATABASE,
            charset: 'utf8mb4',
            timezone: 'Z',
            connectionLimit : 190,
            acquireTimeout: 10000,       
            waitForConnections: true,   
            queueLimit: 0,
            jsonStrings: true,
            decimalNumbers: true,
        });
        this.checkConnection();
    }

    checkConnection() {
        this.db.getConnection((err, connection) => {
            if (err) {
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.error('Database connection was closed.');
                }
                if (err.code === 'ER_CON_COUNT_ERROR') {
                    console.error('Database has too many connections.');
                }
                if (err.code === 'ECONNREFUSED') {
                    console.error('Database connection was refused.');
                }
            }
            if (connection) {
                connection.release();
            }
            return
        });
    }

    query = async (sql, values) => {
        return new Promise((resolve, reject) => {
            const callback = (error, result ) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            }
            
            this.db.query(sql, values, callback);
            
        }).catch(err => {
            throw err;
        });
    }

   

    
}



module.exports = new DB;
