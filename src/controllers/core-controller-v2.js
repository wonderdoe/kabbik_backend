const CoreModelVersion2 = require('../data/models/core-model-v2');
const S3Helper = require('../utils/s3-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const Authvalidator = require('../validators/auth-validator')
require('dotenv').config();

class CoreControllerVersion2 {

    getCombinedData = async (req, res) => {
        const combinedData = await CoreModelVersion2.getCombinedData();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    };
    getHomeCombinedDataApp = async (req, res)=>{
        const combinedData = await CoreModelVersion2.getHomeCombinedDataApp();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    getHomeCombinedDataAppV2 = async (req, res)=>{
        const combinedData = await CoreModelVersion2.getHomeCombinedDataAppV2();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    CornJobgetHomeCombinedDataApp = async ()=>{
        const combinedData = await CoreModelVersion2.CornJobgetHomeCombinedDataApp();
        if (!combinedData) {
            return "failed";
        }
        return "success";
    }
    getHomeBannerApp = async (req, res)=>{
        const combinedData = await CoreModelVersion2.getHomeBannerApp(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    getAppCombinedData = async (req, res)=>{
        const combinedData = await CoreModelVersion2.getAppCombinedData();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }

    postFCMToken = async (req, res) => {
                const data = await CoreModelVersion2.postFCMToken(req.body.user_id, req.body.channel,  req.body.token);        
        
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    }

}

module.exports = new CoreControllerVersion2;