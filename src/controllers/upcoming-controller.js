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
const NodeCache = require("node-cache");
const cache = new NodeCache();

require('dotenv').config();

class UpcomingController {


    createUpcoming = async (req, res) => {

        // console.log("create] started".JSON.stringify(req.body));
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
            // good to go
            let imageUrl = null
            let bannerUrl = null
            let audioUrl = null
            if (req.files && req.files.length > 0) {
                imageUrl = req.files[0].location;
                if (req.files.length > 1) {
                    audioUrl = coreUtils.replaceHTTP(req.files[1].location);
                }
            }
            if (imageUrl == null || audioUrl == null) {
                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to create');
            }
            const {
                name,
                description,
                author,
                contributingArtists,
                price,
                isFree,
                audiobook_id,
                categoryValue: category_value,
                channel_id: channelId
            } = req.body;
            let premium = 0;
            if (price > 0) {
                premium = 1;
            }
            let guid = null;
            const priceFloat = parseFloat(price).toFixed(2)
            const result = await UpcomingModel.createCombined(
                name,
                description,
                author,
                contributingArtists,
                priceFloat,
                guid,
                premium,
                imageUrl,
                bannerUrl,
                audioUrl,
                isFree,
                audiobook_id,
                0
            );
            //console.log(result);
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201, {
                    status: 'success'
                }
            );
        });
    };

    // need to store in cache

    getUpcoming = async (req, res) => {
           
        const cachedData = cache.get("getUpcoming");
    
        if(cachedData){
           if(!cachedData){
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
           }
           return ResponseUtils.respond(
            res,
            constants.HTTP_201, {
                status: 'success',
                data : cachedData
            }
        );
        }
        else{
            const result = await UpcomingModel.getUpcoming();
            cache.set("getUpcoming", result, 100);
            //console.log(result);
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201, {
                    status: 'success',
                    data : result
                }
            );
        }

    };
    deleteUpcoming = async (req, res) => {

            const result = await UpcomingModel.deleteUpcoming(req.query.id);
            //console.log(result);
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201, {
                    status: 'success',
                    data : result
                }
            );
    };


}

module.exports = new UpcomingController;