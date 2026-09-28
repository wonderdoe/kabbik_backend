const S3Helper = require('../utils/s3-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const Authvalidator = require('../validators/auth-validator');
const WritestoryModel = require('../data/models/writestory-model');
require('dotenv').config();

class WritestoryController {

    getWriterStory = async (req, res)=>{
        const combinedData = await WritestoryModel.getWriterStory();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }

    // updateUser = async (req, res)=>{
    //     const combinedData = await WritestoryModel.updateUser(req);
    //     if (!combinedData) {
    //         return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    //     }
    //     return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    // }

    uploadStory = async (req, res)=>{
        
        S3Helper.upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // A Multer error occurred when uploading.
                                        // LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                } else {
                    // An unknown error occurred when uploading.
                                        // LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
            }

            let fileUrl = null
                        if (req.files && req.files.length > 0) {
                fileUrl = req.files[0].location;
            }
            if (fileUrl == null) {

                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to upload');
            }




            req.body.fileUrl = fileUrl;
            const data = await WritestoryModel.uploadStory(req);
            if (!data) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                "data": data
            });
            // const {
            //     title,
            //     size,
            //     description,
            // } = req.body;
            // const result = await AudiobookModel.uploadBannerImage(title, fileUrl, size, description, 0);
            // console.log(result);
            // if (!result) {
            //     return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            // }
            // return ResponseUtils.respond(
            //     res,
            //     constants.HTTP_201, {
            //         id: result.last_id,
            //         image_file_url: fileUrl
            //     }
            // );
        });

    }

    bookRequest = async (req, res)=>{
        

            const data = await WritestoryModel.bookRequest(req);
            if (!data) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                "data": data
            });
    }
    getBookRequest = async (req, res)=>{
        

            const data = await WritestoryModel.getBookRequest(req);
            if (!data) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                "data": data
            });
    }


}

module.exports = new WritestoryController;