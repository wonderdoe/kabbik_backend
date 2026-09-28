const AudiobookModel = require('../data/models/audiobook-model');
const TrackModel = require('../data/models/track-model');
const EpisodeModel = require('../data/models/episode-model');
const S3Helper = require('../utils/s3-helper');
const MulterHelper = require('../utils/multer-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const {
    validationResult
} = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const LoggerError = require('../utils/logger-error');
const axios = require('axios');
const podcastFeedParser = require("podcast-feed-parser")
const ChannelModel = require('../data/models/channel-model');
const UpcomingModel = require('../data/models/upcoming-model');
const parseString = require('xml2js').parseString;
const HeroBannerModel = require('../data/models/hero-banner-model')

require('dotenv').config();

class HeroBannerController {
    getHeroBanner = async (req, res)=>{
        const combinedData = await HeroBannerModel.getHeroBannerList();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }

    getSingleHeroBanner = async(req,res)=>{
        const id = req.params.id;
        const singleData = await HeroBannerModel.getHeroBannerById(id);
        if(!singleData){
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, singleData);
    }

    postHeroBanner = async(req,res) =>{
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
            const data = await HeroBannerModel.uploadHeroBanner(req);
            if (!data) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                "data": data
            });
        
        });
    }
    
    deleteHeroBanner = async(req, res) =>{
        const data = await HeroBannerModel.deleteHeroBanner(req.body.id, req.body.status);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    updateHeroBanner = async(req, res) =>{
        
        if (req.body.imageUrl == null) {
            S3Helper.upload(req, res, async function (err) {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        // A Multer error occurred when uploading.
                                                LoggerError.log(err)
                        return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                    } else {
                        // An unknown error occurred when uploading.
                                                LoggerError.log(err)
                        return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                    }
                }

                let imageUrl = null
                if (req.files && req.files.length > 0) {
                    imageUrl = req.files[0].location;
                }
                if (imageUrl == null) {
                    return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to upload');
                }
                
                
                const result = await HeroBannerModel.updateBannerById(req, imageUrl);
                                if (!result) {
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
                return ResponseUtils.respond(
                    res,
                    constants.HTTP_201, {
                    data: "Success"
                }
                );
            });
        } else {
            const data = await HeroBannerModel.updateBannerById(req, req.body.imageUrl);
            if (!data) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                data: data
            });
        }
    }


}

module.exports = new HeroBannerController;