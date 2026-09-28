const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');


class UpcomingModel {
    tableName = 'audiobooks';


    createCombined = async (
        name,
        description,
        author,
        contributingArtists,
        price,
        guid,
        premium,
        thumbPath,
        bannerPath,
        filePath,
        isFree,
        audiobook_id,
        podcastStatus
    ) => {
        if (podcastStatus == null) {
            podcastStatus = 3
        }

                //console.log(guid);
        const sql = `INSERT INTO upcoming (
            name,
            description,
            file_name,
            file_path,
            isFree,
            author,
            contributingArtists,
            price,
            thumbPath,
            audiobook_id
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            );`
        try {
            const results = await DB.query(sql, [name, description, filePath, filePath, isFree,  author, contributingArtists, price, thumbPath, audiobook_id])
            //console.log(results)
            if (results) {
                // sp returns extra data, need the first one
                // const category_value_obj = JSON.parse(category_value);
                // let count = 0;
                // //console.log(results[1][0].last_id);
                // const audioBookId = results[1][0].last_id;
                // //console.log(audioBookId);
                // if (category_value != null) {
                //     category_value_obj.forEach(async (element) => {
                //         const sql = `INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (${element.id}, ${audioBookId})`;
                //         const result = await DB.query(sql);
                //         //console.log(result);
                //         if (result) {
                //             count++;
                //         }
                //     });
                // }
                // console.log(count);
                // console.log(audioBookId);
                // console.log(results)
                return results;
            }
        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined
        }
    }



    getUpcoming = async () => {

        const sql = `SELECT * FROM upcoming WHERE deleted = 0 order by id desc;`
        try {
            const results = await DB.query(sql)
            //console.log(results)
            if (results) {
                return results;
            }
        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined
        }
    }    
    
    deleteUpcoming = async (id) => {

        const deleteSql = 'Update upcoming set deleted = 1 where id = ?';
        const resDeleteSql = await DB.query(deleteSql, [id]);
        try {
            // const results = await DB.query(sql)
            //console.log(results)
            if (resDeleteSql) {
                return resDeleteSql;
            }
        } catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined
        }
    }
}
module.exports = new UpcomingModel;