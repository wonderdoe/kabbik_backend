const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');

class HeroBannerModel {
    getHeroBannerList = async () => {

        try {
            // version = 2 
            const sql1 = `Select * from home_banner_controller where version = 2`;

            // let jsResult1;
            const result = await DB.query(sql1);
            // const data = JSON.parse(result[0].homeData)
            if (result) {
                return result;
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getHeroBannerById = async (id) => {

        try {
            // currently all the hero-banner are between id 10 to 15
            const sql1 = `Select * from home_banner_controller where id = ?`;

            // let jsResult1;
            const result = await DB.query(sql1, id);
            // const data = JSON.parse(result[0].homeData)
            if (result) {
                return result;
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    
    uploadHeroBanner = async (req) =>{
        // let user_ip

        // if(req.headers["x-forwarded-for"]){

        //     user_ip = req.headers["x-forwarded-for"]
        // }else{
            
        // user_ip = "N/A"
        // }
        
        const sql = `INSERT INTO home_banner_controller (image_url, title, route, status, audiobook_id, package_id, version, comment) VALUES (?,?,?,?,?,?,?,?)`;;
        const result = await DB.query(sql, [req.body.fileUrl, req.body.title, req.body.route, req.body.status, req.body.audiobook_id, req.body.package_id, req.body.version, req.body.comment]);
        // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
        // const result = await DB.query(sql,[id]);
        if (result) {
            //console.log(re)
            // console.log(result[0]);
            return "Success";
        }
        return undefined;
    }

    // deleteHeroBanner = async (id) =>{
    //     try {
    //         const sql = `UPDATE home_banner_controller SET status = 0 WHERE id = ?`;
    //         const results = await DB.query(sql, [id]);
    //         if (results) {
    //             return results;
    //         }
    //         return undefined;
    //     } catch (e) {
    //         LoggerError.log(e)
    //         return undefined;
    //     }
    // }

    deleteHeroBanner = async (id,status) =>{
        try {
            //console.log("id: " + id + " || status : " + status)
            const sql = `UPDATE home_banner_controller SET status = ? WHERE id = ?`;
            const results = await DB.query(sql, [status, id]);
            if (results) {
                return results;
            }
            return undefined;
        } catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    updateBannerById = async (req, imageUrl) =>{
        try {
            //console.log("goooossoo");
                                    const {
                id,
                title,
                route,
                status,
                audiobook_id,
                package_id,
                version,
                comment
            } = req.body;
            

            const sql = `UPDATE home_banner_controller SET  image_url = ?, title = ?, route =?, status = ?, audiobook_id = ?, package_id = ?, version = ?, comment = ? WHERE id = ? `;
            const result = await DB.query(sql, [imageUrl, title, route, status, audiobook_id, package_id, version, comment, id]);
            
            if (result) {
                // console.log(result[0]);
                return "Success";
            }
            return undefined;
        } catch (e) {
            console.log(e.message);
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }


}
module.exports = new HeroBannerModel;